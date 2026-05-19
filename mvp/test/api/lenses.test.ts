import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("/api/projects/[id]/lenses", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("POST creates a lens", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { POST } = await import("@/app/api/projects/[id]/lenses/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          name: "Famiglie",
          description: "Per visitatori con bambini",
          secondaryDriverIds: ["a", "b"],
          active: true,
        }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Famiglie");
    expect(body.projectId).toBe(project.id);
    expect(body.active).toBe(true);
  });

  it("POST validates name — rejects empty string", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { POST } = await import("@/app/api/projects/[id]/lenses/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_name");
  });

  it("POST validates name — rejects whitespace-only", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { POST } = await import("@/app/api/projects/[id]/lenses/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(res.status).toBe(400);
  });

  it("GET lists lenses", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.editorialLens.create({
      data: { projectId: project.id, name: "L1", description: "" },
    });
    await prisma.editorialLens.create({
      data: { projectId: project.id, name: "L2", description: "" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/projects/[id]/lenses/route");
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lenses).toHaveLength(2);
    expect(body.lenses.map((l: { name: string }) => l.name)).toEqual(
      expect.arrayContaining(["L1", "L2"]),
    );
  });

  it("GET returns 404 for project in another tenant", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const { tenantId: otherTenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const otherProject = await prisma.project.create({
      data: { tenantId: otherTenantId, name: "Other" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/projects/[id]/lenses/route");
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: otherProject.id }),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH updates lens fields", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const lens = await prisma.editorialLens.create({
      data: { projectId: project.id, name: "Original", description: "" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { PATCH } = await import(
      "@/app/api/projects/[id]/lenses/[lensId]/route"
    );
    const res = await PATCH(
      new Request("http://x", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated", tone: "emozionale" }),
      }),
      { params: Promise.resolve({ id: project.id, lensId: lens.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated");
    expect(body.tone).toBe("emozionale");
  });

  it("DELETE removes a lens", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const lens = await prisma.editorialLens.create({
      data: { projectId: project.id, name: "ToDelete", description: "" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { DELETE } = await import(
      "@/app/api/projects/[id]/lenses/[lensId]/route"
    );
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ id: project.id, lensId: lens.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify it's gone
    const check = await prisma.editorialLens.findUnique({ where: { id: lens.id } });
    expect(check).toBeNull();
  });

  it("DELETE returns 404 for lens in another tenant", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const { tenantId: otherTenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const otherProject = await prisma.project.create({
      data: { tenantId: otherTenantId, name: "Other" },
    });
    const otherLens = await prisma.editorialLens.create({
      data: { projectId: otherProject.id, name: "OtherLens", description: "" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId,
      email: "a@b.c",
      tenantId,
      role: "Admin" as any,
    });
    const { DELETE } = await import(
      "@/app/api/projects/[id]/lenses/[lensId]/route"
    );
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ id: otherProject.id, lensId: otherLens.id }),
    });
    expect(res.status).toBe(404);
  });
});
