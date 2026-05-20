import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

describe("content draft detail + patch", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("GET returns the full draft; PATCH updates title/body/scheduledAt", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const draft = await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "A", body: "x" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });

    const mod = await import("@/app/api/projects/[id]/content/drafts/[draftId]/route");
    const got = await mod.GET(new Request("http://x") as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect((await got.json()).draft.title).toBe("A");

    const when = "2026-06-01T09:00:00.000Z";
    const patched = await mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "A2", body: "y", scheduledAt: when }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(patched.status).toBe(200);
    const after = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
    expect(after?.title).toBe("A2");
    expect(after?.scheduledAt?.toISOString()).toBe(when);
  });

  it("PATCH 404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const mod = await import("@/app/api/projects/[id]/content/drafts/[draftId]/route");
    const res = await mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "z" }) }) as never, { params: Promise.resolve({ id: "nope", draftId: "nope" }) });
    expect(res.status).toBe(404);
  });
});
