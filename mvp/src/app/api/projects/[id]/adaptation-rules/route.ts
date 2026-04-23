import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

// Regole di adattamento di progetto: come la visita si accorcia/allunga
// quando il visitatore ha meno/più tempo. Salvate in Project.settingsJson.adaptationRules.

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true, settingsJson: true },
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
    const settings = (p.settingsJson as Record<string, unknown> | null) ?? {};
    return NextResponse.json({ rules: settings.adaptationRules ?? null });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api adaptation-rules GET]", err);
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

    const rules = await req.json();
    if (!rules || typeof rules !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const existing = (p.settingsJson as Record<string, unknown> | null) ?? {};
    await prisma.project.update({
      where: { id },
      data: { settingsJson: { ...existing, adaptationRules: rules } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api adaptation-rules PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
