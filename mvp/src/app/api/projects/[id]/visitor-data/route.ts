import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

export async function GET(
  _req: NextRequest,
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
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        languages: true,
        coverImage: true,
        address: true,
        city: true,
        settingsJson: true,
      },
    });
    if (!project)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const [pois, narrators, paths, schede, drivers, personas, qa, missions] =
      await Promise.all([
        prisma.pOI.findMany({
          where: { projectId: id },
          orderBy: [{ zoneId: "asc" }, { orderIndex: "asc" }],
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            lat: true,
            lng: true,
            planimetriaX: true,
            planimetriaY: true,
            minStaySeconds: true,
            orderIndex: true,
            zone: {
              select: {
                id: true,
                name: true,
                function: true,
                order: true,
                color: true,
              },
            },
          },
        }),
        prisma.narratorProfile.findMany({
          where: { projectId: id },
          select: {
            id: true,
            name: true,
            kind: true,
            voiceStyle: true,
            language: true,
            characterBio: true,
            voiceModel: true,
            voiceId: true,
            portraitUrl: true,
            preferredDrivers: true,
          },
        }),
        prisma.path.findMany({
          where: { projectId: id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            durationTargetMinutes: true,
            poiOrderJson: true,
            corePoiIds: true,
            narratorId: true,
            themeFocus: true,
            chaptersJson: true,
            bridgesJson: true,
          },
        }),
        prisma.scheda.findMany({
          where: { projectId: id, status: "published" },
          select: {
            id: true,
            poiId: true,
            narratorId: true,
            language: true,
            title: true,
            scriptText: true,
            durationEstimateSeconds: true,
            isCore: true,
            isDeepDive: true,
            semanticBaseJson: true,
            audio: {
              select: {
                fileUrl: true,
                durationSeconds: true,
                isStale: true,
              },
            },
          },
        }),
        prisma.driver.findMany({
          where: { projectId: id },
          orderBy: { isPrimary: "desc" },
          select: {
            id: true,
            name: true,
            domain: true,
            description: true,
            narrativeValue: true,
            isPrimary: true,
          },
        }),
        prisma.persona.findMany({
          where: { projectId: id },
          select: {
            id: true,
            name: true,
            motivation: true,
            payoff: true,
            preferredDuration: true,
          },
        }),
        prisma.assistantQA.findMany({
          where: { projectId: id },
          select: {
            id: true,
            poiId: true,
            scope: true,
            triggerQuestions: true,
            verifiedAnswer: true,
            extendedAnswer: true,
          },
        }),
        prisma.familyMission.findMany({
          where: { projectId: id },
          select: {
            id: true,
            poiId: true,
            missionType: true,
            kidMissionBrief: true,
            clue: true,
            hintLadderJson: true,
            reward: true,
            characterCue: true,
            visualCue: true,
            durationSeconds: true,
          },
        }),
      ]);

    const settings = (project.settingsJson as Record<string, unknown>) ?? {};
    const familyMode = (settings.familyMode as Record<string, unknown>) ?? {};
    const brief = (settings.brief as Record<string, unknown>) ?? {};

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        languages: project.languages,
        coverImage: project.coverImage,
        address: project.address,
        city: project.city,
        familyMode: familyMode.enabled
          ? {
              enabled: true,
              mascotName: (familyMode.mascotName as string) ?? null,
              etaTarget: (familyMode.etaTarget as string) ?? null,
            }
          : { enabled: false },
        brief: {
          tipoEsperienza: (brief.tipoEsperienza as string) ?? null,
        },
      },
      pois,
      narrators,
      paths,
      schede,
      drivers,
      personas,
      assistantQA: qa,
      familyMissions: missions,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api visitor-data]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
