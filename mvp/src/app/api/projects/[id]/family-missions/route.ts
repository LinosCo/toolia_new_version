import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { FamilyMissionType } from "@/generated/prisma/enums";

const MISSION_TYPES: FamilyMissionType[] = [
  "poi_observation",
  "segment",
  "sync",
];

const SELECT = {
  id: true,
  poiId: true,
  missionType: true,
  kidMissionBrief: true,
  clue: true,
  hintLadderJson: true,
  reward: true,
  familyHandoff: true,
  characterCue: true,
  visualCue: true,
  durationSeconds: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
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
    const poiId = url.searchParams.get("poiId");
    const where: { projectId: string; poiId?: string } = { projectId: id };
    if (poiId) where.poiId = poiId;
    const missions = await prisma.familyMission.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: SELECT,
    });
    return NextResponse.json({ missions });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
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
    if (!poiId)
      return NextResponse.json({ error: "missing_poi" }, { status: 400 });

    const missionType: FamilyMissionType = MISSION_TYPES.includes(
      body?.missionType,
    )
      ? body.missionType
      : "poi_observation";

    const mission = await prisma.familyMission.create({
      data: {
        projectId: id,
        poiId,
        missionType,
        kidMissionBrief:
          typeof body?.kidMissionBrief === "string" ? body.kidMissionBrief : "",
        clue: typeof body?.clue === "string" ? body.clue : null,
        hintLadderJson: Array.isArray(body?.hintLadder) ? body.hintLadder : [],
        reward: typeof body?.reward === "string" ? body.reward : null,
        familyHandoff:
          typeof body?.familyHandoff === "string" ? body.familyHandoff : null,
        characterCue:
          typeof body?.characterCue === "string" ? body.characterCue : null,
        visualCue: typeof body?.visualCue === "string" ? body.visualCue : null,
        durationSeconds:
          typeof body?.durationSeconds === "number" ? body.durationSeconds : 60,
      },
      select: SELECT,
    });
    return NextResponse.json({ mission }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api family-missions POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
