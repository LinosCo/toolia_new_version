import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("/api/projects/[id]/narrative-tension", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("GET returns default shape when no tension exists", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/projects/[id]/narrative-tension/route");
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mustTellJson).toEqual([]);
    expect(body.avoidJson).toEqual([]);
  });

  it("PUT creates tension on first save", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { PUT } = await import("@/app/api/projects/[id]/narrative-tension/route");
    const res = await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({
        mustTellJson: [{ title: "Storia del fondatore", why: "Identitaria" }],
        avoidJson: [{ topic: "controversie politiche", reason: "non in linea con missione" }],
      }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mustTellJson).toHaveLength(1);
    expect(body.avoidJson).toHaveLength(1);
  });

  it("PUT updates existing tension (upsert)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.narrativeTension.create({
      data: { projectId: project.id, mustTellJson: [{ title: "Old" }] },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { PUT } = await import("@/app/api/projects/[id]/narrative-tension/route");
    await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ mustTellJson: [{ title: "New" }] }),
    }), { params: Promise.resolve({ id: project.id }) });

    const stored = await prisma.narrativeTension.findUnique({
      where: { projectId: project.id },
    });
    expect((stored?.mustTellJson as any[])[0].title).toBe("New");
  });

  it("Tenant isolation: other tenant gets 404", async () => {
    const t1 = await seedTenantAndUser();
    const t2 = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId: t1.tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: t2.userId, email: "b@b.c", tenantId: t2.tenantId, role: "Admin" as any,
    });
    const { PUT } = await import("@/app/api/projects/[id]/narrative-tension/route");
    const res = await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ mustTellJson: [] }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(404);
  });
});
