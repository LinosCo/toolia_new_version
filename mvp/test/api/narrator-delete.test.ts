import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("DELETE narrator", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("archives narrator instead of hard-deleting", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const narrator = await prisma.narratorProfile.create({
      data: { projectId: project.id, name: "N", voiceStyle: "neutro" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { DELETE } = await import("@/app/api/projects/[id]/narrators/[narratorId]/route");
    const res = await DELETE(
      new Request("http://x", { method: "DELETE" }),
      { params: Promise.resolve({ id: project.id, narratorId: narrator.id }) },
    );
    expect(res.status).toBe(200);
    const stillExists = await prisma.narratorProfile.findUnique({ where: { id: narrator.id } });
    expect(stillExists?.archived).toBe(true);
  });

  it("archives path instead of hard-deleting", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P2" } });
    const path = await prisma.path.create({
      data: { projectId: project.id, name: "Path1", description: "desc" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { DELETE } = await import("@/app/api/projects/[id]/paths/[pathId]/route");
    const res = await DELETE(
      new Request("http://x", { method: "DELETE" }),
      { params: Promise.resolve({ id: project.id, pathId: path.id }) },
    );
    expect(res.status).toBe(200);
    const stillExists = await prisma.path.findUnique({ where: { id: path.id } });
    expect(stillExists?.archived).toBe(true);
  });

  it("archived narrator is excluded from GET list", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P3" } });
    await prisma.narratorProfile.create({
      data: { projectId: project.id, name: "Active", voiceStyle: "neutro", archived: false },
    });
    await prisma.narratorProfile.create({
      data: { projectId: project.id, name: "Archived", voiceStyle: "neutro", archived: true },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/projects/[id]/narrators/route");
    const res = await GET(
      new Request("http://x"),
      { params: Promise.resolve({ id: project.id }) },
    );
    const data = await res.json();
    expect(data.narrators).toHaveLength(1);
    expect(data.narrators[0].name).toBe("Active");
  });

  it("archived path is excluded from GET list", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P4" } });
    await prisma.path.create({
      data: { projectId: project.id, name: "ActivePath", description: "d", archived: false },
    });
    await prisma.path.create({
      data: { projectId: project.id, name: "ArchivedPath", description: "d", archived: true },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/projects/[id]/paths/route");
    const res = await GET(
      new Request("http://x"),
      { params: Promise.resolve({ id: project.id }) },
    );
    const data = await res.json();
    expect(data.paths).toHaveLength(1);
    expect(data.paths[0].name).toBe("ActivePath");
  });
});
