import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true, settingsJson: true },
  });
}

// MVP: Driver/Personas/Lens/Matrix salvati come blob JSON in Project.settingsJson.driversPersonas.
// Motivo: il client usa campi (lens.name, lens.secondaryDriverIds, persona.preferredExperience,
// driver.enabledContentTypes, ecc.) che non hanno colonne dedicate nello schema. Mantenere tutto
// in JSON evita drop di dati al round-trip.
// TODO: quando servirà query/filtri server-side (es. "quanti progetti usano driver X"),
// normalizzare in rows Driver/Persona + side-car JSON per i campi extra.

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
    const data = settings.driversPersonas ?? null;
    return NextResponse.json({ data });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api drivers GET]", err);
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

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const existing = (p.settingsJson as Record<string, unknown> | null) ?? {};
    await prisma.project.update({
      where: { id },
      data: { settingsJson: { ...existing, driversPersonas: body } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api drivers PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
