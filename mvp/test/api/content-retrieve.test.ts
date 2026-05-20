import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/content/retrieval", () => ({ retrieveContent: vi.fn() }));

import { getSessionUser } from "@/lib/rbac";
import { retrieveContent } from "@/lib/content/retrieval";

describe("POST /api/projects/[id]/content/retrieve", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("returns hits for a query", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(retrieveContent).mockResolvedValue([
      { id: "1", sourceType: "KB_FACT", sourceId: "a", chunkIndex: 0, content: "x", similarity: 0.9 },
    ]);

    const { POST } = await import("@/app/api/projects/[id]/content/retrieve/route");
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ query: "ciao", topK: 5 }) }) as never,
      { params: Promise.resolve({ id: project.id }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hits).toHaveLength(1);
    expect(retrieveContent).toHaveBeenCalledWith({ tenantId, projectId: project.id, query: "ciao", topK: 5 });
  });

  it("400 when query missing", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/retrieve/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });
});
