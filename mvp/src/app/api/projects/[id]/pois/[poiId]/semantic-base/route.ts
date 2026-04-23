import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

async function assertPoi(projectId: string, poiId: string, tenantId: string) {
  return prisma.pOI.findFirst({
    where: { id: poiId, projectId, project: { tenantId } },
    select: { id: true, semanticBaseJson: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; poiId: string }> },
) {
  try {
    const { id, poiId } = await params;
    const user = await getSessionUser();
    const poi = await assertPoi(id, poiId, user.tenantId);
    if (!poi) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ semanticBase: poi.semanticBaseJson ?? {} });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api semantic-base GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; poiId: string }> },
) {
  try {
    const { id, poiId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const poi = await assertPoi(id, poiId, user.tenantId);
    if (!poi) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    await prisma.pOI.update({
      where: { id: poiId },
      data: { semanticBaseJson: body },
    });
    // Quando la base semantica cambia, le schede derivate diventano "stale"?
    // Per ora non tocchiamo lo stato — l'editor può decidere se rigenerare.
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api semantic-base PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
