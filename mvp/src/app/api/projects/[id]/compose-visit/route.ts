import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

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
    const user = await getSessionUser();

    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, settingsJson: true, languages: true },
    });
    if (!project)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

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

    // Carica POI + schede pubblicate + lenti editoriali per scoring
    const [pois, schedePublished, lenses, paths] = await Promise.all([
      prisma.pOI.findMany({
        where: { projectId: id },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          lat: true,
          lng: true,
          minStaySeconds: true,
          orderIndex: true,
          zone: {
            select: { id: true, function: true, order: true, name: true },
          },
        },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.scheda.findMany({
        where: { projectId: id, status: "published", language },
        select: {
          id: true,
          poiId: true,
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
        select: { driverId: true, personaId: true, tone: true },
      }),
      prisma.path.findMany({
        where: { projectId: id },
        select: {
          id: true,
          narratorId: true,
          poiOrderJson: true,
          corePoiIds: true,
        },
      }),
    ]);

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
    const schedeByPoi = new Map<string, typeof schedePublished>();
    for (const s of schedePublished) {
      const arr = schedeByPoi.get(s.poiId) ?? [];
      arr.push(s);
      schedeByPoi.set(s.poiId, arr);
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
    const candidates = pois
      .filter((p) => schedeByPoi.has(p.id))
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

    // Prima includi tutti i core in ordine narrativo
    const selected: typeof candidates = [];
    let totalSec = 0;
    for (const c of candidates) {
      if (!c.isCore) continue;
      const d = poiDuration(c.poi.id);
      selected.push(c);
      totalSec += d;
    }

    // Poi riempi con non-core in ordine di score (desc), fino a budget
    const nonCore = candidates
      .filter((c) => !c.isCore)
      .sort((a, b) => b.score - a.score);
    for (const c of nonCore) {
      const d = poiDuration(c.poi.id);
      if (totalSec + d > durationSeconds) continue;
      selected.push(c);
      totalSec += d;
    }

    // Riordina selezionati in ordine narrativo
    selected.sort((a, b) => {
      const za = a.poi.zone?.order ?? 999;
      const zb = b.poi.zone?.order ?? 999;
      if (za !== zb) return za - zb;
      return a.poi.orderIndex - b.poi.orderIndex;
    });

    // Se ho superato duration includendo tutti i core, ok — i core sono non negoziabili

    // Build response con schede scelte per ogni POI (preferisci narratorId scelto, poi isCore, poi la prima)
    const pickScheda = (poiId: string) => {
      const list = schedeByPoi.get(poiId) ?? [];
      if (list.length === 0) return null;
      if (narratorId) {
        const m = list.find((s) => s.narratorId === narratorId);
        if (m) return m;
      }
      const core = list.find((s) => s.isCore);
      return core ?? list[0];
    };

    const tone = lenses.find(
      (l) => driverIds.includes(l.driverId) && l.personaId === body.personaId,
    )?.tone;

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
      itinerary,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api compose-visit]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
