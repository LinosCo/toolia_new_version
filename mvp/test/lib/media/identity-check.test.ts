import { describe, it, expect, beforeEach, vi } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { checkIdentityPreservation, IDENTITY_THRESHOLD } from "@/lib/media/identity-check";

const ctx = { tenantId: "t", projectId: "p", sourceUrl: "data:image/png;base64,AAA", outputUrl: "data:image/png;base64,BBB" };

describe("checkIdentityPreservation", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("passes when preserved and confidence >= threshold", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: true, confidence: 0.92, notes: "ok" }) } }], usage: { prompt_tokens: 50 } });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(true);
    expect(r.confidence).toBeCloseTo(0.92);
  });

  it("fails when preserved=false", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: false, confidence: 0.95, notes: "cambiato luogo" }) } }], usage: {} });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(false);
  });

  it("fails when confidence below threshold", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: true, confidence: 0.5, notes: "incerto" }) } }], usage: {} });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(false);
    expect(IDENTITY_THRESHOLD).toBe(0.7);
  });

  it("sends BOTH images to the vision model", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: true, confidence: 0.8 }) } }], usage: {} });
    await checkIdentityPreservation(ctx);
    const msgs = mockCreate.mock.calls[0][0].messages;
    const imageParts = JSON.stringify(msgs).match(/image_url/g) ?? [];
    expect(imageParts.length).toBeGreaterThanOrEqual(2);
  });

  it("degrades to failed (not throw) on malformed JSON", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "not-json" } }], usage: {} });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(false);
  });
});
