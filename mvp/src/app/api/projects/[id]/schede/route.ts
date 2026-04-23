import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { SchedaStatus } from "@/generated/prisma/enums";

const STATUSES: SchedaStatus[] = [
  "draft",
  "in_review",
  "client_review",
  "published",
  "archived",
];

const SELECT = {
  id: true,
  poiId: true,
  narratorId: true,
  language: true,
  title: true,
  scriptText: true,
  durationEstimateSeconds: true,
  isCore: true,
  isDeepDive: true,
  status: true,
  version: true,
  qualityScore: true,
  semanticBaseJson: true,
  createdAt: true,
  updatedAt: true,
  audio: {
    select: {
      id: true,
      fileUrl: true,
      durationSeconds: true,
      voiceModel: true,
      isStale: true,
      updatedAt: true,
    },
  },
} as const;

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
}

function wordsPerMinute(text: string, wpm = 150): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / wpm) * 60);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as SchedaStatus | null;

    const where: { projectId: string; status?: SchedaStatus } = {
      projectId: id,
    };
    if (status && STATUSES.includes(status)) where.status = status;

    const schede = await prisma.scheda.findMany({
      where,
      orderBy: [{ poiId: "asc" }, { narratorId: "asc" }],
      select: SELECT,
    });

    // Auto-core: una scheda è essenziale se:
    // - è stata flaggata manualmente (s.isCore), OPPURE
    // - il suo POI è in corePoiIds di almeno un percorso, OPPURE
    // - il suo POI sta in una zona con function=climax (regola deterministica)
    const [paths, climaxPois] = await Promise.all([
      prisma.path.findMany({
        where: { projectId: id },
        select: { corePoiIds: true },
      }),
      prisma.pOI.findMany({
        where: { projectId: id, zone: { function: "climax" } },
        select: { id: true },
      }),
    ]);
    const corePoiSet = new Set<string>();
    for (const p of paths) for (const pid of p.corePoiIds) corePoiSet.add(pid);
    for (const p of climaxPois) corePoiSet.add(p.id);

    const schedeEnriched = schede.map((s) => ({
      ...s,
      isCore: s.isCore || corePoiSet.has(s.poiId),
    }));

    return NextResponse.json({ schede: schedeEnriched });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api schede GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const poiId = typeof body?.poiId === "string" ? body.poiId : "";
    const narratorId =
      typeof body?.narratorId === "string" ? body.narratorId : "";
    const language = typeof body?.language === "string" ? body.language : "it";
    if (!poiId || !narratorId) {
      return NextResponse.json(
        { error: "poi_or_narrator_missing" },
        { status: 400 },
      );
    }

    // Verifica che POI e narratore appartengano al progetto
    const [poi, narr] = await Promise.all([
      prisma.pOI.findFirst({
        where: { id: poiId, projectId: id },
        select: { id: true },
      }),
      prisma.narratorProfile.findFirst({
        where: { id: narratorId, projectId: id },
        select: { id: true },
      }),
    ]);
    if (!poi || !narr) {
      return NextResponse.json({ error: "invalid_refs" }, { status: 400 });
    }

    // Esiste già? unique [poi, narrator, language]
    const existing = await prisma.scheda.findFirst({
      where: { poiId, narratorId, language },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "already_exists", id: existing.id },
        { status: 409 },
      );
    }

    const scriptText =
      typeof body?.scriptText === "string" ? body.scriptText : "";

    // Auto-core: se il POI è essenziale in almeno un percorso, anche la scheda è core
    let autoCore = !!body?.isCore;
    if (!autoCore) {
      const inCorePath = await prisma.path.findFirst({
        where: {
          projectId: id,
          corePoiIds: { has: poiId },
        },
        select: { id: true },
      });
      if (inCorePath) autoCore = true;
    }

    const scheda = await prisma.scheda.create({
      data: {
        projectId: id,
        poiId,
        narratorId,
        language,
        title: typeof body?.title === "string" ? body.title : "",
        scriptText,
        durationEstimateSeconds:
          typeof body?.durationEstimateSeconds === "number"
            ? body.durationEstimateSeconds
            : wordsPerMinute(scriptText),
        isCore: autoCore,
        isDeepDive: !!body?.isDeepDive,
        status: "draft",
        version: 1,
        semanticBaseJson:
          body?.semanticBaseJson && typeof body.semanticBaseJson === "object"
            ? body.semanticBaseJson
            : {},
      },
      select: SELECT,
    });
    return NextResponse.json({ scheda }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api schede POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
