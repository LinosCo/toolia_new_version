import OpenAI from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

export interface EmbeddingContext {
  tenantId: string;
  projectId: string;
  operation: string;
}

/** Restituisce un embedding per ogni testo in input (stesso ordine). */
export async function createEmbeddings(
  inputs: string[],
  ctx: EmbeddingContext,
): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const apiKey = await getTenantApiKey(ctx.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const client = new OpenAI({ apiKey });
  const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: inputs });

  await logLlmCall({
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    operation: ctx.operation,
    provider: "openai",
    model: EMBEDDING_MODEL,
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: 0,
  });

  return res.data.map((d) => d.embedding as number[]);
}
