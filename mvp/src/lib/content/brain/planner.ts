import OpenAI from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { contentPlanSchema, type ContentContext, type ContentPlan, type ContentRequest } from "@/lib/content/brain/types";

// Modello di ragionamento. Verificare id contro docs/strategy/2026-05-20-modelli-ai-reference.md.
export const BRAIN_PLAN_MODEL = "gpt-5.5";

const SYSTEM = `Sei un content strategist. Pianifica UN contenuto PRIMA di scriverlo.
Restituisci JSON: {coreMessage, angle, structure[], mustCover[], avoid[], successCriterion, citations[]}.
- mustCover: gli elementi che DEVONO comparire (dai mustTell della tension map e del brief).
- avoid: ciò che NON deve comparire (dagli avoid).
- citations: gli id dei fatti (facts) su cui ti basi.
Non inventare: appoggiati ai fatti forniti.`;

function buildContextBlock(ctx: ContentContext): string {
  const facts = ctx.facts.map((f) => `[${f.id}] ${f.content}`).join("\n");
  const mustTell = ctx.tension.mustTell.map((m) => `- ${m.title} (${m.why})`).join("\n");
  const avoid = [...ctx.tension.avoid.map((a) => a.topic), ...(ctx.brief?.avoid ?? [])].join(", ");
  const tone = ctx.brand?.tone?.descriptors?.join(", ") ?? ctx.brief?.tono ?? "";
  return `FATTI:\n${facts || "(nessuno)"}\n\nMUST-TELL:\n${mustTell || "(nessuno)"}\n\nAVOID: ${avoid || "(nessuno)"}\nTONO: ${tone}\nLENTE: ${ctx.lens?.name ?? "-"}\nNARRATORE: ${ctx.narrator?.name ?? "-"}`;
}

export async function planContent(ctx: ContentContext, req: ContentRequest): Promise<ContentPlan> {
  const apiKey = await getTenantApiKey(req.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: BRAIN_PLAN_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Formato: ${req.format}. Tema: ${req.topic}.\n\n${buildContextBlock(ctx)}` },
    ],
  });

  await logLlmCall({
    tenantId: req.tenantId,
    projectId: req.projectId,
    operation: "brain_plan",
    provider: "openai",
    model: BRAIN_PLAN_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = contentPlanSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch { /* fall through to fallback */ }

  return contentPlanSchema.parse({
    coreMessage: req.topic,
    mustCover: ctx.tension.mustTell.map((m) => m.title),
    avoid: ctx.tension.avoid.map((a) => a.topic),
  });
}
