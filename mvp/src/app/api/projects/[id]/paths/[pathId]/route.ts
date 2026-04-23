import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

const SELECT = {
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
  createdAt: true,
  updatedAt: true,
} as const;

async function assertOwnership(
  projectId: string,
  pathId: string,
  tenantId: string,
) {
  return prisma.path.findFirst({
    where: { id: pathId, projectId, project: { tenantId } },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pathId: string }> },
) {
  try {
    const { id, pathId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, pathId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim().length > 0)
      data.name = body.name.trim();
    if (typeof body?.description === "string")
      data.description = body.description;
    if (
      typeof body?.durationTargetMinutes === "number" ||
      body?.durationTargetMinutes === null
    )
      data.durationTargetMinutes = body.durationTargetMinutes;
    if (Array.isArray(body?.poiOrder)) data.poiOrderJson = body.poiOrder;
    if (Array.isArray(body?.corePoiIds))
      data.corePoiIds = body.corePoiIds.filter(
        (x: unknown) => typeof x === "string",
      );
    if (typeof body?.narratorId === "string" || body?.narratorId === null)
      data.narratorId = body.narratorId;
    if (typeof body?.themeFocus === "string" || body?.themeFocus === null)
      data.themeFocus = body.themeFocus;
    if (Array.isArray(body?.chapters)) data.chaptersJson = body.chapters;
    if (Array.isArray(body?.bridges)) data.bridgesJson = body.bridges;

    const path = await prisma.path.update({
      where: { id: pathId },
      data,
      select: SELECT,
    });
    return NextResponse.json({ path });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api paths PATCH]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pathId: string }> },
) {
  try {
    const { id, pathId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, pathId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.path.delete({ where: { id: pathId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api paths DELETE]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
