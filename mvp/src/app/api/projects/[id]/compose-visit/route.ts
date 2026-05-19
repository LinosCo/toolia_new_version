import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Graph helpers (scoped to this route)
// ---------------------------------------------------------------------------

interface GraphEdge {
  toNodeId: string;
  weightSec: number;
}

function buildAdjacency(
  segments: Array<{
    fromNodeId: string;
    toNodeId: string;
    traversalSec: number | null;
    bidirectional: boolean;
  }>,
): Map<string, GraphEdge[]> {
  const adj = new Map<string, GraphEdge[]>();
  for (const s of segments) {
    const w = s.traversalSec ?? 60; // default 60s if missing
    const forward: GraphEdge = { toNodeId: s.toNodeId, weightSec: w };
    if (!adj.has(s.fromNodeId)) adj.set(s.fromNodeId, []);
    adj.get(s.fromNodeId)!.push(forward);
    if (s.bidirectional) {
      const reverse: GraphEdge = { toNodeId: s.fromNodeId, weightSec: w };
      if (!adj.has(s.toNodeId)) adj.set(s.toNodeId, []);
      adj.get(s.toNodeId)!.push(reverse);
    }
  }
  return adj;
}

/**
 * Dijkstra shortest path by weightSec. Returns Infinity if unreachable.
 * Uses a sorted array — fine for small graphs (<100 nodes).
 */
function shortestPathSec(
  adj: Map<string, GraphEdge[]>,
  startNodeId: string,
  endNodeId: string,
): number {
  if (startNodeId === endNodeId) return 0;
  const dist = new Map<string, number>();
  dist.set(startNodeId, 0);
  const queue: Array<{ id: string; d: number }> = [{ id: startNodeId, d: 0 }];
  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const current = queue.shift()!;
    if (current.id === endNodeId) return current.d;
    if (current.d > (dist.get(current.id) ?? Infinity)) continue;
    for (const e of adj.get(current.id) ?? []) {
      const newDist = current.d + e.weightSec;
      if (newDist < (dist.get(e.toNodeId) ?? Infinity)) {
        dist.set(e.toNodeId, newDist);
        queue.push({ id: e.toNodeId, d: newDist });
      }
    }
  }
  return Infinity;
}

/**
 * Returns the id of the node spatially closest to the given POI coords.
 * Prefers planimetria coords; falls back to lat/lng.
 */
function findNearestNodeId(
  nodes: Array<{
    id: string;
    lat: number | null;
    lng: number | null;
    planimetriaX: number | null;
    planimetriaY: number | null;
  }>,
  poi: {
    lat: number | null;
    lng: number | null;
    planimetriaX: number | null;
    planimetriaY: number | null;
  },
): string | null {
  if (nodes.length === 0) return null;
  let best: { id: string; d: number } | null = null;
  for (const n of nodes) {
    let d = Infinity;
    if (
      poi.planimetriaX != null &&
      poi.planimetriaY != null &&
      n.planimetriaX != null &&
      n.planimetriaY != null
    ) {
      const dx = poi.planimetriaX - n.planimetriaX;
      const dy = poi.planimetriaY - n.planimetriaY;
      d = Math.sqrt(dx * dx + dy * dy);
    } else if (
      poi.lat != null &&
      poi.lng != null &&
      n.lat != null &&
      n.lng != null
    ) {
      const dx = poi.lat - n.lat;
      const dy = poi.lng - n.lng;
      d = Math.sqrt(dx * dx + dy * dy);
    }
    if (best === null || d < best.d) best = { id: n.id, d };
  }
  return best?.id ?? null;
}

// ---------------------------------------------------------------------------

interface ComposeBody {
  driverIds?: string[];
  personaId?: string | null;
  durationMinutes?: number;
  narratorId?: string | null;
  language?: string;
  familyMode?: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let user: Awaited<ReturnType<typeof getSessionUser>> | null = null;
    try {
      user = await getSessionUser();
    } catch {
      // Visitatore non loggato — accesso pubblico se progetto published
    }

    const project = await prisma.project.findFirst({
      where: user
        ? {
            id,
            OR: [{ tenantId: user.tenantId }, { status: "published" }],
          }
        : { id, status: "published" },
      select: { id: true, settingsJson: true, languages: true, tenantId: true },
    });
    if (!project)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Owner view = editor del proprio tenant: il compose include anche schede
    // in bozza così la preview Studio funziona prima della pubblicazione.
    const isOwnerView = !!user && project.tenantId === user.tenantId;

    const body = (await req.json()) as ComposeBody;
    const driverIds = Array.isArray(body.driverIds) ? body.driverIds : [];
    const duration = Math.max(5, Math.min(240, body.durationMinutes ?? 60));
    const language = body.language ?? "it";
    const familyMode = !!body.familyMode;

    // Pesi driver/persona: se è stata scelta una persona usa i pesi salvati
    let driverWeightMap = new Map<string, number>();
    if (body.personaId) {
      const weights = await prisma.driverPersonaWeight.findMany({
        where: { personaId: body.personaId, driver: { projectId: id } },
        select: { driverId: true, weight: true },
      });
      for (const w of weights) driverWeightMap.set(w.driverId, w.weight);
    }
    const driverWeight = (did: string) => {
      if (driverIds.includes(did)) return 10;
      return driverWeightMap.get(did) ?? 0;
    };

    // Carica POI + schede pubblicate + lenti editoriali + segment graph per scoring
    const [pois, schedePublished, lenses, paths, graphNodes, graphSegments] =
      await Promise.all([
        prisma.pOI.findMany({
          where: { projectId: id },
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            lat: true,
            lng: true,
            planimetriaX: true,
            planimetriaY: true,
            nodeId: true,
            minStaySeconds: true,
            orderIndex: true,
            zone: {
              select: { id: true, function: true, order: true, name: true },
            },
          },
          orderBy: { orderIndex: "asc" },
        }),
        prisma.scheda.findMany({
          where: isOwnerView
            ? { projectId: id, language }
            : { projectId: id, status: "published", language },
          select: {
            id: true,
            poiId: true,
            lensId: true,
            narratorId: true,
            isCore: true,
            isDeepDive: true,
            durationEstimateSeconds: true,
            title: true,
            semanticBaseJson: true,
            audio: { select: { fileUrl: true, durationSeconds: true } },
          },
        }),
        prisma.editorialLens.findMany({
          where: { projectId: id },
          select: { id: true, name: true, description: true, active: true, primaryDriverId: true, secondaryDriverIds: true, personaIds: true, tone: true },
        }),
        prisma.path.findMany({
          where: { projectId: id, archived: false },
          select: {
            id: true,
            narratorId: true,
            poiOrderJson: true,
            corePoiIds: true,
          },
        }),
        prisma.mapNode.findMany({
          where: { projectId: id },
          select: {
            id: true,
            lat: true,
            lng: true,
            planimetriaX: true,
            planimetriaY: true,
          },
        }),
        prisma.segment.findMany({
          where: { projectId: id },
          select: {
            fromNodeId: true,
            toNodeId: true,
            traversalSec: true,
            bidirectional: true,
          },
        }),
      ]);

    // Build segment graph if data available
    const hasGraph = graphNodes.length > 0 && graphSegments.length > 0;
    const adj = hasGraph ? buildAdjacency(graphSegments) : null;

    // -------------------------------------------------------------------------
    // Lens selection: pick the best EditorialLens for this visitor
    // Priority:
    //   1. Lens whose personaIds includes the visitor's personaId
    //   2. Lens whose primaryDriverId is among the visitor's chosen driverIds
    //   3. First active lens
    //   4. null — no lens filter (backward compat)
    // -------------------------------------------------------------------------
    let chosenLens: typeof lenses[number] | null = null;

    if (body.personaId) {
      chosenLens =
        lenses.find((l) => l.active && l.personaIds.includes(body.personaId!)) ??
        null;
    }

    if (!chosenLens && driverIds.length > 0) {
      chosenLens =
        lenses.find(
          (l) => l.active && l.primaryDriverId != null && driverIds.includes(l.primaryDriverId),
        ) ?? null;
    }

    if (!chosenLens) {
      chosenLens = lenses.find((l) => l.active) ?? null;
    }

    // -------------------------------------------------------------------------
    // Re-filter schedePublished by the chosen lens (depth="primary")
    // If a lens was found, prefer schede with that lensId.
    // We keep schedePublished as the broader pool for per-POI fallback.
    // -------------------------------------------------------------------------
    let schedeForLens = schedePublished;
    if (chosenLens) {
      const lensFiltered = schedePublished.filter((s) => s.lensId === chosenLens!.id);
      // Only apply lens filter if it actually yields schede — otherwise keep all (backward compat)
      if (lensFiltered.length > 0) {
        schedeForLens = lensFiltered;
      }
    }

    // Seleziona narratore: param override > percorso > primo narratore
    let narratorId = body.narratorId ?? null;
    if (!narratorId) {
      const pref = paths.find((p) => !!p.narratorId);
      narratorId = pref?.narratorId ?? null;
    }
    if (!narratorId && schedePublished.length > 0) {
      narratorId = schedePublished[0].narratorId;
    }

    // POI essenziali (union corePoiIds + isCore schede)
    const coreSet = new Set<string>();
    for (const p of paths)
      for (const pid of p.corePoiIds ?? []) coreSet.add(pid);
    for (const s of schedePublished) if (s.isCore) coreSet.add(s.poiId);

    // Score per ogni POI: usa driver tag dalla semanticBase delle schede pubbl.
    // Use lens-filtered schede for the primary map; keep all-schede map for fallback.
    const schedeByPoi = new Map<string, typeof schedePublished>();
    for (const s of schedeForLens) {
      const arr = schedeByPoi.get(s.poiId) ?? [];
      arr.push(s);
      schedeByPoi.set(s.poiId, arr);
    }

    // Fallback pool (all published schede regardless of lens) — used when a POI
    // has no scheda in the chosen lens.
    const allSchedeByPoi = new Map<string, typeof schedePublished>();
    for (const s of schedePublished) {
      const arr = allSchedeByPoi.get(s.poiId) ?? [];
      arr.push(s);
      allSchedeByPoi.set(s.poiId, arr);
    }

    type SemanticBase = {
      drivers?: string[];
      angles?: Array<{ driverId?: string; weight?: number }>;
    };

    const poiScore = (poiId: string): number => {
      const schede = schedeByPoi.get(poiId) ?? [];
      if (schede.length === 0) return 0;
      let score = 0;
      for (const s of schede) {
        const base = (s.semanticBaseJson as SemanticBase) ?? {};
        const baseDrivers = Array.isArray(base.drivers) ? base.drivers : [];
        for (const d of baseDrivers) score += driverWeight(String(d));
        const angles = Array.isArray(base.angles) ? base.angles : [];
        for (const a of angles) {
          if (a?.driverId) score += driverWeight(a.driverId) * (a.weight ?? 1);
        }
      }
      if (coreSet.has(poiId)) score += 20;
      return score;
    };

    // Filtra solo POI con almeno una scheda pubblicata nella lingua richiesta
    // Use the broader allSchedeByPoi so POIs with no lens-specific scheda still appear
    const candidates = pois
      .filter((p) => schedeByPoi.has(p.id) || allSchedeByPoi.has(p.id))
      .map((p) => ({
        poi: p,
        score: poiScore(p.id),
        isCore: coreSet.has(p.id),
        stay: p.minStaySeconds ?? 60,
      }));

    // Preferenza ordine narrativo: zone.order poi orderIndex
    candidates.sort((a, b) => {
      const za = a.poi.zone?.order ?? 999;
      const zb = b.poi.zone?.order ?? 999;
      if (za !== zb) return za - zb;
      return a.poi.orderIndex - b.poi.orderIndex;
    });

    // Se ho driver selezionati, ordina mettendo i più pertinenti sopra ma tengo core sempre
    // Strategia semplice: ordine narrativo di base, ma se sforo tempo rimuovo per score crescente (tieni i più rilevanti)
    const durationSeconds = duration * 60;
    // Audio duration preferita, altrimenti durationEstimateSeconds, altrimenti minStaySeconds
    const poiDuration = (poiId: string): number => {
      const schede = schedeByPoi.get(poiId) ?? [];
      const audio = schede.find((s) => s.audio && s.audio.durationSeconds > 0)
        ?.audio?.durationSeconds;
      if (audio) return Math.round(audio);
      const est = schede.find(
        (s) => (s.durationEstimateSeconds ?? 0) > 0,
      )?.durationEstimateSeconds;
      if (est) return est;
      return candidates.find((c) => c.poi.id === poiId)?.stay ?? 60;
    };

    // Helper: resolve effective graph nodeId for a POI (explicit nodeId or nearest by coords)
    const resolveNodeId = (poi: (typeof candidates)[number]["poi"]): string | null => {
      if (poi.nodeId) return poi.nodeId;
      if (!hasGraph) return null;
      return findNearestNodeId(graphNodes, poi);
    };

    // Helper: compute travel seconds between two consecutive POIs (best-effort)
    const travelBetween = (
      fromPoi: (typeof candidates)[number]["poi"],
      toPoi: (typeof candidates)[number]["poi"],
    ): number => {
      if (!hasGraph || !adj) return 60; // fallback: 60s default travel
      const fromNode = resolveNodeId(fromPoi);
      const toNode = resolveNodeId(toPoi);
      if (!fromNode || !toNode) return 60;
      const sec = shortestPathSec(adj, fromNode, toNode);
      return sec === Infinity ? 0 : sec; // unreachable: treat as 0 (graceful fallback)
    };

    // Prima includi tutti i core in ordine narrativo
    const selected: typeof candidates = [];
    let totalSec = 0;
    for (const c of candidates) {
      if (!c.isCore) continue;
      const d = poiDuration(c.poi.id);
      const travel = selected.length > 0 ? travelBetween(selected[selected.length - 1].poi, c.poi) : 0;
      selected.push(c);
      totalSec += travel + d;
    }

    // Poi riempi con non-core in ordine di score (desc), fino a budget
    const nonCore = candidates
      .filter((c) => !c.isCore)
      .sort((a, b) => b.score - a.score);
    for (const c of nonCore) {
      const d = poiDuration(c.poi.id);
      // Estimate travel from last selected POI (before final reorder)
      const travel = selected.length > 0 ? travelBetween(selected[selected.length - 1].poi, c.poi) : 0;
      if (totalSec + travel + d > durationSeconds) continue;
      selected.push(c);
      totalSec += travel + d;
    }

    // Riordina selezionati in ordine narrativo
    selected.sort((a, b) => {
      const za = a.poi.zone?.order ?? 999;
      const zb = b.poi.zone?.order ?? 999;
      if (za !== zb) return za - zb;
      return a.poi.orderIndex - b.poi.orderIndex;
    });

    // Recompute totalSec in final narrative order (graph-aware travel between consecutive POIs)
    totalSec = 0;
    for (let i = 0; i < selected.length; i++) {
      if (i > 0) {
        totalSec += travelBetween(selected[i - 1].poi, selected[i].poi);
      }
      totalSec += poiDuration(selected[i].poi.id);
    }

    // Se ho superato duration includendo tutti i core, ok — i core sono non negoziabili

    // Build response con schede scelte per ogni POI
    // Priority: narrator match > isCore > first
    // Per-POI fallback: if no scheda in chosen lens, fall back to any published scheda
    const pickScheda = (poiId: string) => {
      // Try lens-filtered pool first
      const list = schedeByPoi.get(poiId) ?? [];
      if (list.length > 0) {
        if (narratorId) {
          const m = list.find((s) => s.narratorId === narratorId);
          if (m) return m;
        }
        const core = list.find((s) => s.isCore);
        return core ?? list[0];
      }

      // Per-POI fallback: no scheda in chosen lens — try all published schede for this POI
      const fallback = allSchedeByPoi.get(poiId) ?? [];
      if (fallback.length === 0) return null;
      if (narratorId) {
        const m = fallback.find((s) => s.narratorId === narratorId);
        if (m) return m;
      }
      const core = fallback.find((s) => s.isCore);
      return core ?? fallback[0];
    };

    // Use tone from the chosen lens (already determined above)
    const tone = chosenLens?.tone ?? null;

    const itinerary = selected.map((c, idx) => {
      const scheda = pickScheda(c.poi.id);
      return {
        order: idx + 1,
        poi: {
          id: c.poi.id,
          name: c.poi.name,
          description: c.poi.description,
          imageUrl: c.poi.imageUrl,
          lat: c.poi.lat,
          lng: c.poi.lng,
          zone: c.poi.zone?.name ?? null,
        },
        scheda: scheda
          ? {
              id: scheda.id,
              title: scheda.title,
              narratorId: scheda.narratorId,
              durationSeconds: poiDuration(c.poi.id),
              audio: scheda.audio?.fileUrl
                ? {
                    url: scheda.audio.fileUrl,
                    durationSeconds: scheda.audio.durationSeconds,
                  }
                : null,
            }
          : null,
        isCore: c.isCore,
        score: c.score,
      };
    });

    return NextResponse.json({
      visit: {
        narratorId,
        language,
        familyMode,
        durationRequestedMinutes: duration,
        durationActualSeconds: totalSec,
        tone: tone ?? null,
        poiCount: itinerary.length,
      },
      lens: chosenLens
        ? {
            id: chosenLens.id,
            name: chosenLens.name,
            description: chosenLens.description,
          }
        : null,
      itinerary,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api compose-visit]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
