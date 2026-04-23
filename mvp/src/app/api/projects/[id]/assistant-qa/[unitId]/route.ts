import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

const SELECT = {
  id: true,
  poiId: true,
  scope: true,
  triggerQuestions: true,
  verifiedAnswer: true,
  extendedAnswer: true,
  doNotAnswerBeyond: true,
  sessionRelevance: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function assertOwnership(
  projectId: string,
  unitId: string,
  tenantId: string,
) {
  return prisma.assistantQA.findFirst({
    where: { id: unitId, projectId, project: { tenantId } },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> },
) {
  try {
    const { id, unitId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, unitId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (Array.isArray(body?.triggerQuestions))
      data.triggerQuestions = body.triggerQuestions.filter(
        (x: unknown) => typeof x === "string",
      );
    if (typeof body?.verifiedAnswer === "string")
      data.verifiedAnswer = body.verifiedAnswer;
    if (
      typeof body?.extendedAnswer === "string" ||
      body?.extendedAnswer === null
    )
      data.extendedAnswer = body.extendedAnswer;
    if (
      typeof body?.doNotAnswerBeyond === "string" ||
      body?.doNotAnswerBeyond === null
    )
      data.doNotAnswerBeyond = body.doNotAnswerBeyond;
    if (
      typeof body?.sessionRelevance === "string" ||
      body?.sessionRelevance === null
    )
      data.sessionRelevance = body.sessionRelevance;

    const unit = await prisma.assistantQA.update({
      where: { id: unitId },
      data,
      select: SELECT,
    });
    return NextResponse.json({ unit });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> },
) {
  try {
    const { id, unitId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, unitId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.assistantQA.delete({ where: { id: unitId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
