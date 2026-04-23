import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
}

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
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const paths = await prisma.path.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
      select: SELECT,
    });
    return NextResponse.json({ paths });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api paths GET]", err);
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 1) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const path = await prisma.path.create({
      data: {
        projectId: id,
        name,
        description:
          typeof body?.description === "string" ? body.description : "",
        durationTargetMinutes:
          typeof body?.durationTargetMinutes === "number"
            ? body.durationTargetMinutes
            : null,
        poiOrderJson: Array.isArray(body?.poiOrder) ? body.poiOrder : [],
        corePoiIds: Array.isArray(body?.corePoiIds)
          ? body.corePoiIds.filter((x: unknown) => typeof x === "string")
          : [],
        narratorId:
          typeof body?.narratorId === "string" ? body.narratorId : null,
        themeFocus:
          typeof body?.themeFocus === "string" ? body.themeFocus : null,
        chaptersJson: Array.isArray(body?.chapters) ? body.chapters : [],
      },
      select: SELECT,
    });
    return NextResponse.json({ path }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api paths POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
