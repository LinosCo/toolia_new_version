import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
  ),
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
}));

import { getSessionUser, UnauthorizedError } from "@/lib/rbac";

describe("POST /api/scrape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getSessionUser).mockRejectedValue(new UnauthorizedError());
    const { POST } = await import("@/app/api/scrape/route");
    const req = new Request("http://x/api/scrape", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
