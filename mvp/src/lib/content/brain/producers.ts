import OpenAI from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import type { ContentContext, ContentPlan, ContentRequest, GeneratedArtifact, VerificationResult } from "@/lib/content/brain/types";

// Modello scrittore. Verificare id contro docs/strategy/2026-05-20-modelli-ai-reference.md.
export const BRAIN_PRODUCE_MODEL = "gpt-5.5";

interface ProducerDef { system: string }

const PRODUCERS: Record<string, ProducerDef> = {
  social_post: { system: `Sei un copywriter social. Scrivi un post breve, incisivo, hook iniziale forte. JSON {title, body}.` },
  article: { system: `Sei un redattore. Scrivi un articolo strutturato (paragrafi, sottotitoli impliciti). JSON {title, body}.` },
};

export const SUPPORTED_FORMATS = Object.keys(PRODUCERS);

export async function produceArtifact(
  plan: ContentPlan,
  ctx: ContentContext,
  req: ContentRequest,
  critique?: Pick<VerificationResult, "mustTellMissing" | "avoidViolations">,
): Promise<GeneratedArtifact> {
  const def = PRODUCERS[req.format];
  if (!def) throw new Error(`Formato non supportato: ${req.format}`);

  const apiKey = await getTenantApiKey(req.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const tone = ctx.brand?.tone?.descriptors?.join(", ") ?? ctx.brief?.tono ?? "";
  const facts = ctx.facts.map((f) => `[${f.id}] ${f.content}`).join("\n");
  const critiqueBlock = critique
    ? `\n\nCORREGGI: includi assolutamente: ${critique.mustTellMissing.join(", ") || "-"}. Rimuovi: ${critique.avoidViolations.join(", ") || "-"}.`
    : "";

  const user = `PIANO:\n${JSON.stringify(plan)}\n\nFATTI (usa SOLO questi):\n${facts || "(nessuno)"}\n\nTONO: ${tone}\nNARRATORE: ${ctx.narrator?.voiceStyle ?? "-"}\nLingua: ${req.language ?? "it"}.${critiqueBlock}`;

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: BRAIN_PRODUCE_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [{ role: "system", content: def.system }, { role: "user", content: user }],
  });

  await logLlmCall({
    tenantId: req.tenantId, projectId: req.projectId, operation: "brain_produce",
    provider: "openai", model: BRAIN_PRODUCE_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { title?: unknown; body?: unknown } = {};
  try { parsed = JSON.parse(raw); } catch { /* keep empty */ }
  return {
    title: typeof parsed.title === "string" ? parsed.title : req.topic,
    body: typeof parsed.body === "string" ? parsed.body : "",
  };
}
