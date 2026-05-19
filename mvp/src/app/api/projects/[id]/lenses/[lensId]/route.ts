import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";

async function assertOwnership(
  projectId: string,
  lensId: string,
  tenantId: string,
) {
  return prisma.editorialLens.findFirst({
    where: { id: lensId, projectId, project: { tenantId } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lensId: string }> },
) {
  const { id, lensId } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const lens = await assertOwnership(id, lensId, user.tenantId);
    if (!lens) return new Response("Not found", { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (body.primaryDriverId !== undefined) data.primaryDriverId = body.primaryDriverId;
    if (body.secondaryDriverIds) data.secondaryDriverIds = body.secondaryDriverIds;
    if (body.personaIds) data.personaIds = body.personaIds;
    if (body.tone !== undefined) data.tone = body.tone;
    if (body.description !== undefined) data.description = body.description;
    if (body.active !== undefined) data.active = body.active;

    const updated = await prisma.editorialLens.update({
      where: { id: lensId },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; lensId: string }> },
) {
  const { id, lensId } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const lens = await assertOwnership(id, lensId, user.tenantId);
    if (!lens) return new Response("Not found", { status: 404 });

    await prisma.editorialLens.delete({ where: { id: lensId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
