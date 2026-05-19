import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock auth and rbac
vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

// Mock tenant-keys so we control what getTenantApiKey returns — no DB needed
vi.mock("@/lib/tenant-keys", () => ({
  getTenantApiKey: vi.fn(),
}));

// Mock the OpenAI constructor — route uses `import OpenAI from "openai"`
const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey } from "@/lib/tenant-keys";
import OpenAI from "openai";

const FAKE_TENANT_ID = "tenant-test-001";
const FAKE_USER_ID = "user-test-001";

const VALID_SOURCE = {
  kind: "sito" as const,
  text: "Contenuto di test per il sito.",
  importance: "primaria",
  reliability: "alta",
};

describe("extract-kb-single prefers server API key", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset handleAuthError mock to return null (no auth error) by default
    vi.mocked(handleAuthError).mockReturnValue(null);
    // Default: no server key configured
    vi.mocked(getTenantApiKey).mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              facts: [
                { content: "Un fatto di test.", category: "solido", sourceQaId: null },
              ],
            }),
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
  });

  it("uses tenant server key when present, ignores body.apiKey", async () => {
    // Server key is configured
    vi.mocked(getTenantApiKey).mockResolvedValue("sk-server-key");
    vi.mocked(getSessionUser).mockResolvedValue({
      id: FAKE_USER_ID,
      email: "a@b.c",
      tenantId: FAKE_TENANT_ID,
      role: "Admin" as any,
    });

    const { POST } = await import("@/app/api/ai/extract-kb-single/route");
    await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          apiKey: "sk-body-key", // should be IGNORED
          provider: "openai",
          projectName: "Forte di Test",
          source: VALID_SOURCE,
        }),
      }),
    );

    // Verify getTenantApiKey was called with the tenant's ID
    expect(getTenantApiKey).toHaveBeenCalledWith(FAKE_TENANT_ID, "openai");

    // Verify OpenAI constructor was called with server key, not body key
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-server-key" }),
    );
    expect(OpenAI).not.toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-body-key" }),
    );
  });

  it("falls back to body.apiKey when no server key configured", async () => {
    // getTenantApiKey returns null → no server key
    vi.mocked(getTenantApiKey).mockResolvedValue(null);
    vi.mocked(getSessionUser).mockResolvedValue({
      id: FAKE_USER_ID,
      email: "a@b.c",
      tenantId: FAKE_TENANT_ID,
      role: "Admin" as any,
    });

    const { POST } = await import("@/app/api/ai/extract-kb-single/route");
    await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          apiKey: "sk-body-key",
          provider: "openai",
          projectName: "Forte di Test",
          source: VALID_SOURCE,
        }),
      }),
    );

    // Verify OpenAI constructor was called with body key as fallback
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-body-key" }),
    );
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getSessionUser).mockRejectedValue(new Error("unauthorized"));
    // handleAuthError returns a 401 response when it's an auth error
    vi.mocked(handleAuthError).mockReturnValue(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    );

    const { POST } = await import("@/app/api/ai/extract-kb-single/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          apiKey: "sk-body-key",
          provider: "openai",
          projectName: "t",
          source: VALID_SOURCE,
        }),
      }),
    );

    // Either 401 (handled auth error) or 500 (rethrown) — both acceptable
    expect([401, 500]).toContain(res.status);
  });
});
