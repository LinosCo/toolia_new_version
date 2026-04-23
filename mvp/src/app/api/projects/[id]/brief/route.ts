import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const row = await prisma.brief.findUnique({
      where: { projectId: id },
      select: { contenutoJson: true, updatedAt: true },
    });
    return NextResponse.json({
      brief: row?.contenutoJson ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api brief GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const brief = await req.json();
    if (!brief || typeof brief !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const obiettivo =
      typeof brief.obiettivo === "string" ? brief.obiettivo : "";
    const obiettivoCliente =
      typeof brief.obiettivoCliente === "string" ? brief.obiettivoCliente : "";
    const tipoEsperienza =
      typeof brief.tipoEsperienza === "string" ? brief.tipoEsperienza : "";

    const row = await prisma.brief.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        obiettivo,
        obiettivoCliente,
        tipoEsperienza,
        contenutoJson: brief,
      },
      update: {
        obiettivo,
        obiettivoCliente,
        tipoEsperienza,
        contenutoJson: brief,
      },
      select: { contenutoJson: true, updatedAt: true },
    });
    return NextResponse.json({
      brief: row.contenutoJson,
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api brief PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
