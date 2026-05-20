import { describe, it, expect, beforeEach, vi } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { planContent } from "@/lib/content/brain/planner";
import type { ContentContext } from "@/lib/content/brain/types";

const ctx: ContentContext = {
  facts: [{ id: "f1", sourceType: "KB_FACT", sourceId: "k1", chunkIndex: 0, content: "L'affresco è incompiuto", similarity: 0.9 }],
  brand: { tone: { descriptors: ["caldo"], citations: [] } },
  tension: { mustTell: [{ title: "Affresco incompiuto", why: "domanda" }], avoid: [{ topic: "prezzi", reason: "x" }], verify: [] },
  lens: { name: "Storico", description: "d", tone: "autorevole" },
  narrator: { name: "Guida", voiceStyle: "caldo", characterBio: null },
  brief: { tono: "evocativo", mustTell: ["storia"], avoid: ["tecnicismi"] },
};

describe("planContent", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("returns a validated ContentPlan and logs usage", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ coreMessage: "Il mistero dell'affresco", angle: "domanda", structure: ["hook", "fatto", "cta"], mustCover: ["Affresco incompiuto"], avoid: ["prezzi"], successCriterion: "curiosità", citations: ["f1"] }) } }],
      usage: { prompt_tokens: 80, completion_tokens: 40 },
    });
    const plan = await planContent(ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "affresco" });
    expect(plan.coreMessage).toBe("Il mistero dell'affresco");
    expect(plan.mustCover).toContain("Affresco incompiuto");
    expect(logLlmCall).toHaveBeenCalledWith(expect.objectContaining({ operation: "brain_plan", provider: "openai" }));
  });

  it("throws when no API key", async () => {
    vi.mocked(getTenantApiKey).mockResolvedValue(null);
    await expect(planContent(ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "x" })).rejects.toThrow();
  });

  it("falls back to a minimal plan if the LLM JSON is malformed", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "non-json" } }], usage: {} });
    const plan = await planContent(ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "affresco" });
    expect(plan.coreMessage.length).toBeGreaterThan(0); // fallback uses topic
  });
});
