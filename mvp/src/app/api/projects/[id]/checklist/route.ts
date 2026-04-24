import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

const KEYS = [
  "revisione_contenuti",
  "verifica_fatti",
  "qualita_immagini",
  "approvazione_cliente",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor", "Reviewer"]);

    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, settingsJson: true },
    });
    if (!project)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const current = (project.settingsJson as Record<string, unknown>) ?? {};
    const existing =
      (current.qualityChecklist as Record<string, boolean>) ?? {};
    const next: Record<string, boolean> = { ...existing };
    for (const k of KEYS) {
      if (typeof body[k] === "boolean") next[k] = body[k] as boolean;
    }

    await prisma.project.update({
      where: { id },
      data: {
        settingsJson: { ...current, qualityChecklist: next },
      },
    });

    return NextResponse.json({ checklist: next });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api checklist patch]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Endpoint "pubblica" — cambia status progetto a published se ok
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, settingsJson: true, status: true },
    });
    if (!project)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const settings = (project.settingsJson as Record<string, unknown>) ?? {};
    const checklist =
      (settings.qualityChecklist as Record<string, boolean>) ?? {};
    const allChecked = KEYS.every((k) => checklist[k] === true);
    if (!allChecked)
      return NextResponse.json(
        { error: "checklist_incomplete" },
        { status: 400 },
      );

    const updated = await prisma.project.update({
      where: { id },
      data: { status: "published" },
      select: { id: true, status: true },
    });
    return NextResponse.json({ project: updated });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api checklist post]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
