import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";

// Modello vision/multimodale. Verificare l'id esatto contro docs/strategy/2026-05-20-modelli-ai-reference.md.
export const BRAND_VISION_MODEL = "gpt-5.5";

const visionSchema = z.object({
  evidence: z.array(z.object({
    field: z.string(),
    value: z.unknown(),
    description: z.string().optional(),
    confidence: z.number().optional(),
  })).default([]),
});

const SYSTEM = `Sei un analista di brand. Estrai FATTI ATOMICI di brand dall'asset fornito.
Restituisci JSON {"evidence":[{field,value,description?,confidence?}]}.
field usa dot-notation: palette.primary, palette.accent, typography.heading, logo.description,
tone.descriptor, imagery.style, imagery.subject, formats.preferred. value è il valore osservato
(es. "#112233", "caldo", "fotografia naturale"). confidence 0..1. Non inventare: estrai solo ciò che vedi.`;

export interface ExtractResult { evidenceCount: number; status: "READY" | "FAILED"; model: string; error?: string }

export async function extractBrandAsset(args: { assetId: string }): Promise<ExtractResult> {
  const asset = await prisma.brandAsset.findUnique({ where: { id: args.assetId } });
  if (!asset) return { evidenceCount: 0, status: "FAILED", model: BRAND_VISION_MODEL, error: "asset_not_found" };

  await prisma.brandAsset.update({ where: { id: asset.id }, data: { status: "EXTRACTING" } });

  try {
    const apiKey = await getTenantApiKey(asset.tenantId, "openai");
    if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

    const client = new OpenAI({ apiKey });
    const userContent =
      asset.kind === "UPLOAD_IMAGE" && asset.content
        ? [
            { type: "text" as const, text: "Analizza questo asset visivo di brand." },
            { type: "image_url" as const, image_url: { url: asset.content, detail: "high" as const } },
          ]
        : `Analizza questo asset di brand (testo):\n\n${asset.content ?? asset.sourceUrl ?? ""}`;

    const completion = await client.chat.completions.create({
      model: BRAND_VISION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent as never },
      ],
    });

    await logLlmCall({
      tenantId: asset.tenantId, projectId: asset.projectId, operation: "brand_extract",
      provider: "openai", model: BRAND_VISION_MODEL,
      inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = visionSchema.safeParse(JSON.parse(raw));
    const rows = parsed.success ? parsed.data.evidence : [];

    await prisma.$transaction(async (tx) => {
      await tx.brandEvidence.deleteMany({ where: { assetId: asset.id } });
      for (const r of rows) {
        await tx.brandEvidence.create({
          data: {
            projectId: asset.projectId, assetId: asset.id,
            field: r.field, value: r.value as never,
            description: r.description, confidence: r.confidence, sourceModel: BRAND_VISION_MODEL,
          },
        });
      }
      await tx.brandAsset.update({ where: { id: asset.id }, data: { status: "READY", extractedAt: new Date(), extractorError: null } });
    });

    return { evidenceCount: rows.length, status: "READY", model: BRAND_VISION_MODEL };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "extract_failed";
    await prisma.brandAsset.update({ where: { id: asset.id }, data: { status: "FAILED", extractorError: msg } });
    return { evidenceCount: 0, status: "FAILED", model: BRAND_VISION_MODEL, error: msg };
  }
}
