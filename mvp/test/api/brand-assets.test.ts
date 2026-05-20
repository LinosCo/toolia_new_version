import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

describe("brand assets API", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("creates and lists assets", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });

    const { POST, GET } = await import("@/app/api/projects/[id]/brand/assets/route");
    const created = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ kind: "UPLOAD_TEXT", content: "ciao", category: "PAST_CONTENT" }) }) as never,
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(created.status).toBe(201);

    const list = await GET(new Request("http://x") as never, { params: Promise.resolve({ id: project.id }) });
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.assets).toHaveLength(1);
  });

  it("404 cross-tenant on create", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/brand/assets/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ kind: "UPLOAD_TEXT", content: "x" }) }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
