import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
import { getSessionUser } from "@/lib/rbac";

describe("/api/tenant/api-keys", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("GET returns providers with configured=false initially", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/tenant/api-keys/route");
    const res = await GET(new Request("http://x"));
    const body = await res.json();
    expect(body.keys).toContainEqual({ provider: "openai", configured: false });
  });

  it("PUT stores a key, GET returns configured=true (without value)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { PUT, GET } = await import("@/app/api/tenant/api-keys/route");
    await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ provider: "openai", value: "sk-abc" }),
    }));
    const res = await GET(new Request("http://x"));
    const body = await res.json();
    expect(body.keys).toContainEqual({ provider: "openai", configured: true });
    expect(JSON.stringify(body)).not.toContain("sk-abc");
  });
});
