import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("POST schede unique constraint", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("returns 409 on duplicate (poi, narrator, language)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const poi = await prisma.pOI.create({ data: { projectId: project.id, name: "POI" } });
    const narrator = await prisma.narratorProfile.create({
      data: { projectId: project.id, name: "N", voiceStyle: "neutro" },
    });
    await prisma.scheda.create({
      data: {
        projectId: project.id, poiId: poi.id, narratorId: narrator.id,
        language: "it", title: "T", scriptText: "txt",
      },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { POST } = await import("@/app/api/projects/[id]/schede/route");
    const res = await POST(new Request("http://x", {
      method: "POST",
      body: JSON.stringify({
        poiId: poi.id, narratorId: narrator.id, language: "it",
        title: "T2", scriptText: "txt2",
      }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(409);
  });
});
