import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

async function setup(role: string, status: string) {
  const { tenantId, userId } = await seedTenantAndUser();
  const prisma = getTestPrisma();
  const project = await prisma.project.create({ data: { tenantId, name: "P" } });
  const draft = await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "A", body: "x", status: status as never } });
  vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: role as never });
  return { prisma, project, draft };
}

describe("POST content draft transition", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("Editor: draft -> in_review (200)", async () => {
    const { prisma, project, draft } = await setup("Editor", "draft");
    const { POST } = await import("@/app/api/projects/[id]/content/drafts/[draftId]/transition/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to: "in_review" }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(res.status).toBe(200);
    const after = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
    expect(after?.status).toBe("in_review");
  });

  it("Editor: in_review -> published is FORBIDDEN (403), status unchanged", async () => {
    const { prisma, project, draft } = await setup("Editor", "in_review");
    const { POST } = await import("@/app/api/projects/[id]/content/drafts/[draftId]/transition/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to: "published" }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(res.status).toBe(403);
    const after = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
    expect(after?.status).toBe("in_review");
  });

  it("400 on invalid target status", async () => {
    const { project, draft } = await setup("Admin", "draft");
    const { POST } = await import("@/app/api/projects/[id]/content/drafts/[draftId]/transition/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to: "nonsense" }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(res.status).toBe(400);
  });
});
