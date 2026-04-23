import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { PayoffType, DurationPreference } from "@/generated/prisma/enums";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
}

// Mapping client (italiano) ↔ DB enum (inglese)
const payoffC2D: Record<string, PayoffType> = {
  meraviglia: "wonder",
  conoscenza: "knowledge",
  emozione: "emotion",
  scoperta: "discovery",
};
const payoffD2C: Record<PayoffType, string> = {
  wonder: "meraviglia",
  knowledge: "conoscenza",
  emotion: "emozione",
  discovery: "scoperta",
};
const durationC2D: Record<string, DurationPreference> = {
  breve: "short",
  media: "medium",
  lunga: "long",
};
const durationD2C: Record<DurationPreference, string> = {
  short: "breve",
  medium: "media",
  long: "lunga",
};

interface ClientDriver {
  id: string;
  name: string;
  domain: string;
  description: string;
  narrativeValue: string;
  enabledContentTypes?: string[];
  order?: number;
}
interface ClientPersona {
  id: string;
  name: string;
  motivation: string;
  payoff: string;
  preferredDuration: string;
  preferredExperience?: string[];
  validityNotes?: string;
  suggestedDriverIds?: string[];
  order?: number;
}
interface ClientWeight {
  driverId: string;
  personaId: string;
  weight: number;
}
interface ClientLens {
  id: string;
  name?: string;
  personaId: string;
  primaryDriverId: string;
  secondaryDriverIds?: string[];
  description?: string;
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

    const [drivers, personas, weights, lenses, config] = await Promise.all([
      prisma.driver.findMany({ where: { projectId: id } }),
      prisma.persona.findMany({ where: { projectId: id } }),
      prisma.driverPersonaWeight.findMany({
        where: { driver: { projectId: id } },
      }),
      prisma.editorialLens.findMany({ where: { projectId: id } }),
      prisma.projectDriverConfig.findUnique({ where: { projectId: id } }),
    ]);

    if (
      drivers.length === 0 &&
      personas.length === 0 &&
      weights.length === 0 &&
      lenses.length === 0 &&
      !config
    ) {
      return NextResponse.json({ data: null });
    }

    const driversExt = drivers.map((d, i) => {
      const extra = (d as unknown as { enabledContentTypesJson?: unknown })
        .enabledContentTypesJson;
      return {
        id: d.id,
        name: d.name,
        domain: d.domain,
        description: d.description,
        narrativeValue: d.narrativeValue,
        enabledContentTypes: Array.isArray(extra) ? (extra as string[]) : [],
        order: i,
      };
    });

    return NextResponse.json({
      data: {
        drivers: driversExt,
        personas: personas.map((p, i) => ({
          id: p.id,
          name: p.name,
          motivation: p.motivation,
          payoff: payoffD2C[p.payoff],
          preferredDuration: durationD2C[p.preferredDuration],
          preferredExperience: [],
          validityNotes: "",
          suggestedDriverIds: [],
          order: i,
        })),
        matrix: weights.map((w) => ({
          driverId: w.driverId,
          personaId: w.personaId,
          weight: w.weight,
        })),
        lenses: lenses.map((l) => ({
          id: l.id,
          name: "",
          personaId: l.personaId,
          primaryDriverId: l.driverId,
          secondaryDriverIds: [],
          description: l.tone ?? "",
        })),
        continuityRules: [],
        dominanceRules: config?.dominanceRulesJson ?? {},
        inferenceModel: config?.inferenceModelJson ?? {},
        familyTriggerRules: config?.familyTriggerRulesJson ?? {},
        visitorSignalModel: config?.visitorSignalModelJson ?? {},
        wizardInteractionRules: config?.wizardInteractionJson ?? {},
        generatedAt: config?.generatedAt?.toISOString(),
        updatedAt: config?.updatedAt?.toISOString(),
      },
    });
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
    const drivers: ClientDriver[] = Array.isArray(body?.drivers)
      ? body.drivers
      : [];
    const personas: ClientPersona[] = Array.isArray(body?.personas)
      ? body.personas
      : [];
    const matrix: ClientWeight[] = Array.isArray(body?.matrix)
      ? body.matrix
      : [];
    const lenses: ClientLens[] = Array.isArray(body?.lenses) ? body.lenses : [];
    // Salvataggio in JSONB per i campi fluidi.
    const continuityRules = Array.isArray(body?.continuityRules)
      ? body.continuityRules
      : [];

    await prisma.$transaction(async (tx) => {
      // Cancella in ordine di dipendenza
      await tx.editorialLens.deleteMany({ where: { projectId: id } });
      await tx.driverPersonaWeight.deleteMany({
        where: { driver: { projectId: id } },
      });
      await tx.persona.deleteMany({ where: { projectId: id } });
      await tx.driver.deleteMany({ where: { projectId: id } });

      for (const d of drivers) {
        await tx.driver.create({
          data: {
            id: d.id,
            projectId: id,
            name: d.name,
            domain: d.domain,
            description: d.description,
            narrativeValue: d.narrativeValue,
          },
        });
      }
      for (const pr of personas) {
        await tx.persona.create({
          data: {
            id: pr.id,
            projectId: id,
            name: pr.name,
            motivation: pr.motivation,
            payoff: payoffC2D[pr.payoff] ?? "knowledge",
            preferredDuration: durationC2D[pr.preferredDuration] ?? "medium",
          },
        });
      }
      for (const w of matrix) {
        // Evita inserimenti per id inesistenti
        const d = drivers.find((x) => x.id === w.driverId);
        const p = personas.find((x) => x.id === w.personaId);
        if (!d || !p) continue;
        await tx.driverPersonaWeight.create({
          data: {
            driverId: w.driverId,
            personaId: w.personaId,
            weight: Math.max(0, Math.min(10, Math.round(w.weight))),
          },
        });
      }
      for (const l of lenses) {
        const d = drivers.find((x) => x.id === l.primaryDriverId);
        const p = personas.find((x) => x.id === l.personaId);
        if (!d || !p) continue;
        await tx.editorialLens.create({
          data: {
            id: l.id,
            projectId: id,
            driverId: l.primaryDriverId,
            personaId: l.personaId,
            tone: l.description ?? null,
          },
        });
      }

      await tx.projectDriverConfig.upsert({
        where: { projectId: id },
        create: {
          projectId: id,
          narrativeContinuityJson: continuityRules,
          dominanceRulesJson: body?.dominanceRules ?? {},
          inferenceModelJson: body?.inferenceModel ?? {},
          familyTriggerRulesJson: body?.familyTriggerRules ?? {},
          visitorSignalModelJson: body?.visitorSignalModel ?? {},
          wizardInteractionJson: body?.wizardInteractionRules ?? {},
        },
        update: {
          narrativeContinuityJson: continuityRules,
          dominanceRulesJson: body?.dominanceRules ?? {},
          inferenceModelJson: body?.inferenceModel ?? {},
          familyTriggerRulesJson: body?.familyTriggerRules ?? {},
          visitorSignalModelJson: body?.visitorSignalModel ?? {},
          wizardInteractionJson: body?.wizardInteractionRules ?? {},
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api drivers PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
