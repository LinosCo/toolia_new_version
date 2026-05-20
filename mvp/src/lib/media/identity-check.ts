import OpenAI from "openai";
import { z } from "zod";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";

// Vision per il check identità. Verificare id contro modelli-ai-reference (gemini-3-1-pro/claude-opus-4-7 i primary; gpt-4o cablabile su OpenAI).
export const IDENTITY_CHECK_MODEL = "gpt-4o";
export const IDENTITY_THRESHOLD = 0.7;

const schema = z.object({ preserved: z.boolean(), confidence: z.number().min(0).max(1), notes: z.string().optional() });

export interface IdentityResult { passed: boolean; preserved: boolean; confidence: number; notes?: string }

const SYSTEM = `Sei un revisore di fedeltà visiva. Ricevi due immagini: SORGENTE (foto reale del cliente) e OUTPUT (versione modificata).
Verifica che l'OUTPUT PRESERVI l'identità: stessi luoghi/edifici/prodotti/persone, stesse proporzioni e disposizione; NON deve aver inventato o sostituito elementi reali. Modifiche di luce/colore/stile sono OK; cambi di soggetto/struttura NO.
Restituisci JSON {"preserved": boolean, "confidence": 0..1, "notes": string}.`;

export async function checkIdentityPreservation(args: {
  tenantId: string; projectId: string; sourceUrl: string; outputUrl: string;
}): Promise<IdentityResult> {
  const apiKey = await getTenantApiKey(args.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: IDENTITY_CHECK_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: [
        { type: "text", text: "SORGENTE:" },
        { type: "image_url", image_url: { url: args.sourceUrl, detail: "high" } },
        { type: "text", text: "OUTPUT:" },
        { type: "image_url", image_url: { url: args.outputUrl, detail: "high" } },
      ] as never },
    ],
  });

  await logLlmCall({
    tenantId: args.tenantId, projectId: args.projectId, operation: "media_identity_check",
    provider: "openai", model: IDENTITY_CHECK_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { preserved?: boolean; confidence?: number; notes?: string };
  try { parsed = schema.parse(JSON.parse(raw)); }
  catch { return { passed: false, preserved: false, confidence: 0, notes: "check non valutabile" }; }

  const preserved = parsed.preserved === true;
  const confidence = parsed.confidence ?? 0;
  return { passed: preserved && confidence >= IDENTITY_THRESHOLD, preserved, confidence, notes: parsed.notes };
}
