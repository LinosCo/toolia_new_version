import { prisma } from "@/lib/db";

interface PriceInput {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
}

// Prezzi aggiornati 2026-05. TODO: spostare in env vars o tabella DB per facile update.
const PRICES: Record<string, { in: number; out: number }> = {
  "openai:gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "openai:gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "openai:gpt-4o-2024-08-06": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "openai:text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "openai:text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
  "openai:dall-e-3": { in: 0, out: 0 }, // priced per image elsewhere
  "anthropic:claude-sonnet-4-6": { in: 3 / 1_000_000, out: 15 / 1_000_000 },
  "anthropic:claude-opus-4-7": { in: 15 / 1_000_000, out: 75 / 1_000_000 },
  "anthropic:claude-haiku-4-5": { in: 0.8 / 1_000_000, out: 4 / 1_000_000 },
  "kimi:moonshot-v1-128k": { in: 0.5 / 1_000_000, out: 1 / 1_000_000 }, // approx
};

// ElevenLabs: priced per character; simplified to per-second (~3 chars/sec at 150 char/min target)
const ELEVENLABS_PER_SECOND = 0.00033;

export function calculateCost(input: PriceInput): number {
  if (input.provider === "elevenlabs") {
    return (input.audioSeconds ?? 0) * ELEVENLABS_PER_SECOND;
  }
  const key = `${input.provider}:${input.model}`;
  const price = PRICES[key];
  if (!price) return 0;
  return (input.inputTokens ?? 0) * price.in + (input.outputTokens ?? 0) * price.out;
}

export interface LogLlmCallInput {
  tenantId: string;
  projectId: string | null;
  operation: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
}

export async function logLlmCall(input: LogLlmCallInput): Promise<void> {
  const costUsd = calculateCost(input);
  try {
    await prisma.llmUsage.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        operation: input.operation,
        provider: input.provider,
        model: input.model,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        audioSeconds: input.audioSeconds ?? 0,
        costUsd,
      },
    });
  } catch (e) {
    // Never break the AI call because logging failed
    console.error("[llm-usage] failed to log call:", e);
  }
}
