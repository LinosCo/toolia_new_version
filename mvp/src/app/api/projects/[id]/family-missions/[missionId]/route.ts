import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

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

async function assertOwnership(
  projectId: string,
  missionId: string,
  tenantId: string,
) {
  return prisma.familyMission.findFirst({
    where: { id: missionId, projectId, project: { tenantId } },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; missionId: string }> },
) {
  try {
    const { id, missionId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, missionId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body?.missionType === "string")
      data.missionType = body.missionType;
    if (typeof body?.kidMissionBrief === "string")
      data.kidMissionBrief = body.kidMissionBrief;
    if (typeof body?.clue === "string" || body?.clue === null)
      data.clue = body.clue;
    if (Array.isArray(body?.hintLadder)) data.hintLadderJson = body.hintLadder;
    if (typeof body?.reward === "string" || body?.reward === null)
      data.reward = body.reward;
    if (typeof body?.familyHandoff === "string" || body?.familyHandoff === null)
      data.familyHandoff = body.familyHandoff;
    if (typeof body?.characterCue === "string" || body?.characterCue === null)
      data.characterCue = body.characterCue;
    if (typeof body?.visualCue === "string" || body?.visualCue === null)
      data.visualCue = body.visualCue;
    if (typeof body?.durationSeconds === "number")
      data.durationSeconds = body.durationSeconds;

    const mission = await prisma.familyMission.update({
      where: { id: missionId },
      data,
      select: SELECT,
    });
    return NextResponse.json({ mission });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; missionId: string }> },
) {
  try {
    const { id, missionId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, missionId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.familyMission.delete({ where: { id: missionId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
