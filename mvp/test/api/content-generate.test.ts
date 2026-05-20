import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
vi.mock("@/lib/content/brain/orchestrator", () => ({ generateContent: vi.fn() }));
import { getSessionUser } from "@/lib/rbac";
import { generateContent } from "@/lib/content/brain/orchestrator";

describe("POST /api/projects/[id]/content/generate", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("200 with draft+verification", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(generateContent).mockResolvedValue({ draft: { id: "d1", title: "T", body: "B" }, verification: { passed: true, mustTellCovered: [], mustTellMissing: [], avoidViolations: [] } });

    const { POST } = await import("@/app/api/projects/[id]/content/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ format: "social_post", topic: "affresco" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.draft.id).toBe("d1");
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ tenantId, projectId: project.id, format: "social_post", topic: "affresco" }));
  });

  it("400 when format/topic missing", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });

  it("404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ format: "social_post", topic: "x" }) }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
