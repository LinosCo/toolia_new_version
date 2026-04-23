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

    const units = await prisma.assistantQA.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: SELECT,
    });
    return NextResponse.json({ units });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api qa GET]", err);
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
    const unit = await prisma.assistantQA.create({
      data: {
        projectId: id,
        poiId: typeof body?.poiId === "string" ? body.poiId : null,
        scope: typeof body?.scope === "string" ? body.scope : "poi",
        triggerQuestions: Array.isArray(body?.triggerQuestions)
          ? body.triggerQuestions.filter((x: unknown) => typeof x === "string")
          : [],
        verifiedAnswer:
          typeof body?.verifiedAnswer === "string" ? body.verifiedAnswer : "",
        extendedAnswer:
          typeof body?.extendedAnswer === "string" ? body.extendedAnswer : null,
        doNotAnswerBeyond:
          typeof body?.doNotAnswerBeyond === "string"
            ? body.doNotAnswerBeyond
            : null,
        sessionRelevance:
          typeof body?.sessionRelevance === "string"
            ? body.sessionRelevance
            : null,
      },
      select: SELECT,
    });
    return NextResponse.json({ unit }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api qa POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
