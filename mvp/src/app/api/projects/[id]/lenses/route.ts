import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const lenses = await prisma.editorialLens.findMany({
      where: { projectId: id },
      include: { primaryDriver: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ lenses });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const body = await req.json();
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const lens = await prisma.editorialLens.create({
      data: {
        projectId: id,
        name: body.name.trim(),
        primaryDriverId: body.primaryDriverId ?? null,
        secondaryDriverIds: body.secondaryDriverIds ?? [],
        personaIds: body.personaIds ?? [],
        tone: body.tone ?? null,
        description: body.description ?? "",
        active: body.active ?? true,
      },
    });
    return NextResponse.json(lens);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
