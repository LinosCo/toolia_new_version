import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import { PayoffType, DurationPreference } from "@/generated/prisma/client";

const VALID_PAYOFF_TYPES = Object.values(PayoffType) as string[];
const VALID_DURATION_PREFS = Object.values(DurationPreference) as string[];

function toPayoffType(v: unknown): PayoffType {
  const s = String(v ?? "");
  return VALID_PAYOFF_TYPES.includes(s) ? (s as PayoffType) : PayoffType.wonder;
}

function toDurationPreference(v: unknown): DurationPreference {
  const s = String(v ?? "");
  return VALID_DURATION_PREFS.includes(s)
    ? (s as DurationPreference)
    : DurationPreference.medium;
}

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

    // Full-replace normalized tables for this project (transactional)
    await prisma.$transaction(
      async (tx) => {
        // Delete in reverse dependency order
        await tx.driverPersonaWeight.deleteMany({
          where: { driver: { projectId: id } },
        });
        await tx.editorialLens.deleteMany({ where: { projectId: id } });
        await tx.persona.deleteMany({ where: { projectId: id } });
        await tx.driver.deleteMany({ where: { projectId: id } });

        // Create drivers — map client-side temp IDs to DB IDs
        const driverIdMap = new Map<string, string>();
        for (const d of (body.drivers ?? []) as Array<Record<string, unknown>>) {
          const clientId = String(d.id ?? "");
          const created = await tx.driver.create({
            data: {
              projectId: id,
              name: String(d.name ?? ""),
              domain: String(d.domain ?? ""),
              description: String(d.description ?? ""),
              narrativeValue: String(d.narrativeValue ?? ""),
              isPrimary: Boolean(d.isPrimary ?? false),
            },
          });
          if (clientId) driverIdMap.set(clientId, created.id);
        }

        // Create personas — map client-side temp IDs to DB IDs
        const personaIdMap = new Map<string, string>();
        for (const p of (body.personas ?? []) as Array<Record<string, unknown>>) {
          const clientId = String(p.id ?? "");
          const created = await tx.persona.create({
            data: {
              projectId: id,
              name: String(p.name ?? ""),
              motivation: String(p.motivation ?? ""),
              payoff: toPayoffType(p.payoff),
              preferredDuration: toDurationPreference(p.preferredDuration),
            },
          });
          if (clientId) personaIdMap.set(clientId, created.id);
        }

        // Create matrix weights
        for (const w of (body.matrix ?? []) as Array<Record<string, unknown>>) {
          const dId = driverIdMap.get(String(w.driverId ?? ""));
          const pId = personaIdMap.get(String(w.personaId ?? ""));
          if (!dId || !pId) continue;
          await tx.driverPersonaWeight.create({
            data: {
              driverId: dId,
              personaId: pId,
              weight: Number(w.weight ?? 0),
            },
          });
        }

        // Create editorial lenses
        for (const lens of (body.lenses ?? []) as Array<Record<string, unknown>>) {
          const primaryDriverId = lens.primaryDriverId
            ? driverIdMap.get(String(lens.primaryDriverId)) ?? null
            : null;
          const secondaryDriverIds = (
            (lens.secondaryDriverIds as string[] | undefined) ?? []
          )
            .map((did) => driverIdMap.get(did))
            .filter((x): x is string => !!x);
          const personaIds = (
            (lens.personaIds as string[] | undefined) ?? []
          )
            .map((pid) => personaIdMap.get(pid))
            .filter((x): x is string => !!x);
          await tx.editorialLens.create({
            data: {
              projectId: id,
              name: String(lens.name ?? `Lens ${lens.id ?? ""}`),
              primaryDriverId: primaryDriverId ?? null,
              secondaryDriverIds,
              personaIds,
              tone: lens.tone != null ? String(lens.tone) : null,
              description: String(lens.description ?? ""),
              active: Boolean(lens.active ?? true),
            },
          });
        }
      },
      { timeout: 30000 },
    );

    // Keep the legacy JSONB blob for backward compat (existing frontend reads it)
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
