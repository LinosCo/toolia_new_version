import { describe, it, expect, beforeEach, vi } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { produceArtifact, SUPPORTED_FORMATS } from "@/lib/content/brain/producers";
import type { ContentContext, ContentPlan } from "@/lib/content/brain/types";

const ctx: ContentContext = { facts: [], brand: null, tension: { mustTell: [], avoid: [], verify: [] }, lens: null, narrator: null, brief: null };
const plan: ContentPlan = { coreMessage: "msg", angle: "a", structure: ["x"], mustCover: ["Affresco"], avoid: ["prezzi"], successCriterion: "s", citations: [] };

describe("produceArtifact", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("lists supported formats", () => {
    expect(SUPPORTED_FORMATS).toContain("social_post");
    expect(SUPPORTED_FORMATS).toContain("article");
  });

  it("produces title+body for a known format", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "Titolo", body: "Corpo con Affresco" }) } }], usage: { prompt_tokens: 10, completion_tokens: 50 } });
    const out = await produceArtifact(plan, ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "affresco" });
    expect(out.title).toBe("Titolo");
    expect(out.body).toContain("Affresco");
  });

  it("includes critique feedback on retry", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "T", body: "B" }) } }], usage: {} });
    await produceArtifact(plan, ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "x" }, { mustTellMissing: ["Affresco"], avoidViolations: [] });
    const sentUser = mockCreate.mock.calls[0][0].messages.map((m: { content: string }) => m.content).join("\n");
    expect(sentUser).toContain("Affresco");
  });

  it("throws on unknown format", async () => {
    await expect(produceArtifact(plan, ctx, { projectId: "p", tenantId: "t", format: "nope", topic: "x" })).rejects.toThrow();
  });
});
