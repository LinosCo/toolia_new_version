import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGenerate = vi.fn();
const mockEdit = vi.fn();
vi.mock("openai", () => ({
  default: class { images = { generate: mockGenerate, edit: mockEdit }; },
  toFile: vi.fn(async () => ({ name: "f.png" })),
}));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));
vi.mock("@/lib/media/identity-check", () => ({ checkIdentityPreservation: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { checkIdentityPreservation } from "@/lib/media/identity-check";
import { generateMedia } from "@/lib/media/generate";

const base = { tenantId: "t", projectId: "p" };

describe("generateMedia", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("Mode A (GENERATION): returns a data URL, status ready, no identity check", async () => {
    mockGenerate.mockResolvedValue({ data: [{ b64_json: "AAA" }] });
    const r = await generateMedia({ ...base, mode: "GENERATION", prompt: "un'illustrazione" });
    expect(r.status).toBe("ready");
    expect(r.outputUrl).toMatch(/^data:image\/png;base64,/);
    expect(checkIdentityPreservation).not.toHaveBeenCalled();
  });

  it("Mode B (PRESERVATION_EDIT): edits, runs identity check, ready when passed", async () => {
    mockEdit.mockResolvedValue({ data: [{ b64_json: "BBB" }] });
    vi.mocked(checkIdentityPreservation).mockResolvedValue({ passed: true, preserved: true, confidence: 0.9, notes: "ok" });
    const r = await generateMedia({ ...base, mode: "PRESERVATION_EDIT", prompt: "schiarisci", sourceUrl: "data:image/png;base64,SRC" });
    expect(mockEdit).toHaveBeenCalled();
    expect(checkIdentityPreservation).toHaveBeenCalled();
    expect(r.status).toBe("ready");
    expect(r.identityPassed).toBe(true);
  });

  it("Mode B: status REJECTED when identity check fails", async () => {
    mockEdit.mockResolvedValue({ data: [{ b64_json: "BBB" }] });
    vi.mocked(checkIdentityPreservation).mockResolvedValue({ passed: false, preserved: false, confidence: 0.4, notes: "cambiato" });
    const r = await generateMedia({ ...base, mode: "PRESERVATION_EDIT", prompt: "x", sourceUrl: "data:image/png;base64,SRC" });
    expect(r.status).toBe("rejected");
    expect(r.identityPassed).toBe(false);
    expect(r.outputUrl).toBeTruthy();
  });

  it("Mode B without sourceUrl throws", async () => {
    await expect(generateMedia({ ...base, mode: "PRESERVATION_EDIT", prompt: "x" })).rejects.toThrow();
  });

  it("cascade: falls back to the next model when the first generate throws", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("model down")).mockResolvedValueOnce({ data: [{ b64_json: "AAA" }] });
    const r = await generateMedia({ ...base, mode: "GENERATION", prompt: "x" });
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(r.status).toBe("ready");
  });

  it("unsupported modes (STYLE_TRANSFER/LAYOUT) return failed mode_not_yet_supported", async () => {
    const r = await generateMedia({ ...base, mode: "LAYOUT", prompt: "x" });
    expect(r.status).toBe("failed");
    expect(r.error).toContain("not_yet_supported");
  });
});
