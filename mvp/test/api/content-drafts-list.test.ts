import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

describe("GET /api/projects/[id]/content/drafts", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("lists drafts, filterable by status", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "A", body: "x", status: "draft" } });
    await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "article", title: "B", body: "y", status: "published" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });

    const { GET } = await import("@/app/api/projects/[id]/content/drafts/route");
    const all = await GET(new Request("http://x/api") as never, { params: Promise.resolve({ id: project.id }) });
    expect((await all.json()).drafts).toHaveLength(2);

    const onlyDraft = await GET(new Request("http://x/api?status=draft") as never, { params: Promise.resolve({ id: project.id }) });
    const body = await onlyDraft.json();
    expect(body.drafts).toHaveLength(1);
    expect(body.drafts[0].title).toBe("A");
  });

  it("404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { GET } = await import("@/app/api/projects/[id]/content/drafts/route");
    const res = await GET(new Request("http://x/api") as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
