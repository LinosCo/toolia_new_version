import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true, settingsJson: true },
  });
}

// MVP: Sources (planimetria, website, documents, interview, images, logo)
// salvate come blob JSON in Project.settingsJson.sources.
// TODO Fase successiva: normalizzare in Source/Interview rows quando servirà
// ricerca/filtri server-side e spostare binari su R2.

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
    const sources = settings.sources ?? null;
    return NextResponse.json({ sources });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api sources GET]", err);
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

    const sources = await req.json();
    if (!sources || typeof sources !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const existing = (p.settingsJson as Record<string, unknown> | null) ?? {};
    await prisma.project.update({
      where: { id },
      data: {
        settingsJson: { ...existing, sources },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api sources PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
