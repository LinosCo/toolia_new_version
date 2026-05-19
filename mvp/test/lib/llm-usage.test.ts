import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";
import { logLlmCall, calculateCost } from "@/lib/llm-usage";

describe("LLM usage tracking", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("calculateCost GPT-4o", () => {
    // GPT-4o: $2.50/1M input, $10/1M output
    const cost = calculateCost({
      provider: "openai", model: "gpt-4o",
      inputTokens: 1000, outputTokens: 500,
    });
    expect(cost).toBeCloseTo(0.0025 + 0.005, 5);
  });

  it("calculateCost ElevenLabs TTS by seconds", () => {
    const cost = calculateCost({
      provider: "elevenlabs", model: "eleven_multilingual_v2",
      audioSeconds: 60,
    });
    expect(cost).toBeGreaterThan(0);
  });

  it("calculateCost returns 0 for unknown model", () => {
    const cost = calculateCost({
      provider: "openai", model: "gpt-99-unknown",
      inputTokens: 1000, outputTokens: 500,
    });
    expect(cost).toBe(0);
  });

  it("logLlmCall stores record", async () => {
    const { tenantId } = await seedTenantAndUser();
    await logLlmCall({
      tenantId, projectId: null,
      operation: "extract-kb",
      provider: "openai", model: "gpt-4o",
      inputTokens: 1000, outputTokens: 500,
    });
    const prisma = getTestPrisma();
    const records = await prisma.llmUsage.findMany({ where: { tenantId } });
    expect(records).toHaveLength(1);
    expect(records[0].operation).toBe("extract-kb");
    expect(records[0].costUsd).toBeGreaterThan(0);
  });

  it("logLlmCall stores per-project record", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await logLlmCall({
      tenantId, projectId: project.id,
      operation: "generate-scheda",
      provider: "openai", model: "gpt-4o",
      inputTokens: 500, outputTokens: 1000,
    });
    const records = await prisma.llmUsage.findMany({ where: { projectId: project.id } });
    expect(records).toHaveLength(1);
    expect(records[0].projectId).toBe(project.id);
  });

  it("logLlmCall does not throw when DB unavailable", async () => {
    // Pass an invalid tenantId — log should NOT throw
    await expect(logLlmCall({
      tenantId: "nonexistent",
      projectId: null,
      operation: "test",
      provider: "openai", model: "gpt-4o",
      inputTokens: 100, outputTokens: 50,
    })).resolves.toBeUndefined();
  });
});
