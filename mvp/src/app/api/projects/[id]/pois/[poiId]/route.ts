import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; poiId: string }> },
) {
  try {
    const { id, poiId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const poi = await prisma.pOI.findFirst({
      where: { id: poiId, projectId: id, project: { tenantId: user.tenantId } },
      select: { id: true },
    });
    if (!poi) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof body.imageUrl === "string" || body.imageUrl === null)
      data.imageUrl = body.imageUrl;
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.description === "string" || body.description === null)
      data.description = body.description;
    if (typeof body.lat === "number" || body.lat === null) data.lat = body.lat;
    if (typeof body.lng === "number" || body.lng === null) data.lng = body.lng;

    const updated = await prisma.pOI.update({
      where: { id: poiId },
      data,
      select: { id: true, imageUrl: true, name: true },
    });
    return NextResponse.json({ poi: updated });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api poi PATCH]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
