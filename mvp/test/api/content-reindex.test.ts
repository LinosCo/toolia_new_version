import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/content/indexer", () => ({ indexProjectKB: vi.fn() }));

import { getSessionUser } from "@/lib/rbac";
import { indexProjectKB } from "@/lib/content/indexer";

describe("POST /api/projects/[id]/content/reindex", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("reindexes KB and returns counts", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(indexProjectKB).mockResolvedValue({ facts: 3, chunks: 7 });

    const { POST } = await import("@/app/api/projects/[id]/content/reindex/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: project.id }) });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ facts: 3, chunks: 7 });
    expect(indexProjectKB).toHaveBeenCalledWith({ tenantId, projectId: project.id });
  });

  it("404 when project belongs to another tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/reindex/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
