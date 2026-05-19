import { describe, it, expect, vi } from "vitest";

// Mock auth so every route returns 401 when there is no session
vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn().mockRejectedValue(new Error("UnauthorizedError")),
  requireRole: vi.fn(),
  handleAuthError: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    ),
  UnauthorizedError: class extends Error {},
}));

// Stub tenant-keys (never reached when auth fails, but required for module import)
vi.mock("@/lib/tenant-keys", () => ({
  getTenantApiKey: vi.fn().mockResolvedValue(null),
}));

// Stub OpenAI (never reached when auth fails, but some routes import it at module scope)
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
    images: { generate: vi.fn() },
  })),
}));

const ROUTES = [
  "extract-kb",
  "interview-questions",
  "analyze-planimetria",
  "generate-bridges",
  "generate-brief",
  "generate-family-missions",
  "generate-narrator-portrait",
  "generate-poi-image",
  "generate-qa-pack",
  "generate-scheda",
  "generate-semantic-base",
  "match-images-to-poi",
  "propose-drivers-personas",
  "propose-graph",
  "propose-luogo",
  "propose-narrators",
  "propose-paths",
  "propose-tension-map",
  "suggest-zones",
];

describe.each(ROUTES)("AI route /api/ai/%s requires auth", (routeName) => {
  it("returns 401 without session", async () => {
    const mod = await import(`@/app/api/ai/${routeName}/route`);
    const res = await mod.POST(
      new Request("http://x", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(401);
  });
});
