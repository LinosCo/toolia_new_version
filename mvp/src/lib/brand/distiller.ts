import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { brandSkillManifestSchema, type BrandSkillManifest } from "@/lib/brand/manifest";

// Modello per la distillazione. Verificare id contro docs/strategy/2026-05-20-modelli-ai-reference.md.
export const BRAND_DISTILL_MODEL = "gpt-5.5";

const SYSTEM = `Sei un brand strategist. Dato un elenco di EVIDENZE atomiche di brand (con id),
sintetizza un BrandSkill manifest JSON con i campi: palette, typography, logo, tone, imagery, formats, summary.
Per OGNI campo popolato, includi "citations": gli id delle evidenze che lo supportano. Non inventare:
usa solo ciò che le evidenze supportano. Restituisci SOLO il JSON del manifest.`;

export type DistillationResult =
  | { ok: true; skillId: string; version: number; manifest: BrandSkillManifest }
  | { ok: false; error: string };

export async function distillBrandSkill(args: { projectId: string; tenantId: string }): Promise<DistillationResult> {
  const evidence = await prisma.brandEvidence.findMany({
    where: { projectId: args.projectId },
    select: { id: true, field: true, value: true, confidence: true },
    take: 500,
  });
  if (evidence.length === 0) return { ok: false, error: "no_evidence" };

  const apiKey = await getTenantApiKey(args.tenantId, "openai");
  if (!apiKey) return { ok: false, error: "no_api_key" };

  const client = new OpenAI({ apiKey });
  const evidenceText = evidence.map((e) => `- [${e.id}] ${e.field} = ${JSON.stringify(e.value)} (conf ${e.confidence ?? "?"})`).join("\n");

  const completion = await client.chat.completions.create({
    model: BRAND_DISTILL_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Evidenze:\n${evidenceText}` },
    ],
  });

  await logLlmCall({
    tenantId: args.tenantId, projectId: args.projectId, operation: "brand_distill",
    provider: "openai", model: BRAND_DISTILL_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid_manifest" };
  }
  const parsed = brandSkillManifestSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "invalid_manifest" };

  const created = await prisma.$transaction(async (tx) => {
    await tx.brandSkill.updateMany({ where: { projectId: args.projectId, status: "CURRENT" }, data: { status: "SUPERSEDED" } });
    const last = await tx.brandSkill.findFirst({ where: { projectId: args.projectId }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (last?.version ?? 0) + 1;
    return tx.brandSkill.create({
      data: {
        projectId: args.projectId, version, status: "CURRENT",
        manifest: parsed.data as never,
        builtFromEvidenceIds: evidence.map((e) => e.id) as never,
        distillerModel: BRAND_DISTILL_MODEL,
        distillerTokensIn: completion.usage?.prompt_tokens ?? 0,
        distillerTokensOut: completion.usage?.completion_tokens ?? 0,
      },
    });
  });

  return { ok: true, skillId: created.id, version: created.version, manifest: parsed.data };
}
