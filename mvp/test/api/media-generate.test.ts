import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
vi.mock("@/lib/media/generate", () => ({ generateMedia: vi.fn() }));
import { getSessionUser } from "@/lib/rbac";
import { generateMedia } from "@/lib/media/generate";

describe("POST /api/projects/[id]/media/generate", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("persists a MediaAsset and returns it (Mode A)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(generateMedia).mockResolvedValue({ outputUrl: "data:image/png;base64,AAA", model: "gpt-image-2", status: "ready" });

    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "GENERATION", prompt: "x" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.asset.status).toBe("ready");
    const stored = await prisma.mediaAsset.findUnique({ where: { id: body.asset.id } });
    expect(stored?.outputUrl).toContain("base64");
  });

  it("persists rejected status when identity fails (Mode B)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(generateMedia).mockResolvedValue({ outputUrl: "data:image/png;base64,BBB", model: "gpt-image-2", status: "rejected", identityPassed: false, identityScore: 0.4, identityNotes: "cambiato" });

    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "PRESERVATION_EDIT", prompt: "x", sourceUrl: "data:image/png;base64,SRC" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).asset.status).toBe("rejected");
  });

  it("400 invalid body (PRESERVATION_EDIT without sourceUrl)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "PRESERVATION_EDIT", prompt: "x" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });

  it("404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "GENERATION", prompt: "x" }) }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
