import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
vi.mock("@/lib/brand/distiller", () => ({ distillBrandSkill: vi.fn() }));
import { getSessionUser } from "@/lib/rbac";
import { distillBrandSkill } from "@/lib/brand/distiller";

describe("POST /api/projects/[id]/brand/distill", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("200 with skill on success", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(distillBrandSkill).mockResolvedValue({ ok: true, skillId: "s1", version: 1, manifest: { summary: "x" } });

    const { POST } = await import("@/app/api/projects/[id]/brand/distill/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe(1);
  });

  it("422 when distillation fails (no evidence)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(distillBrandSkill).mockResolvedValue({ ok: false, error: "no_evidence" });

    const { POST } = await import("@/app/api/projects/[id]/brand/distill/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(422);
  });
});
