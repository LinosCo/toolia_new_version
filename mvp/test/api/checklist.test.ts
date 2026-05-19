import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("POST /api/projects/[id]/checklist (publish)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("rejects publish when checklist OK but blockers exist (no schede published)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({
      data: {
        tenantId,
        name: "Test",
        settingsJson: {
          qualityChecklist: {
            revisione_contenuti: true,
            verifica_fatti: true,
            qualita_immagini: true,
            approvazione_cliente: true,
          },
        },
      },
    });

    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });

    const { POST } = await import("@/app/api/projects/[id]/checklist/route");
    const res = await POST(
      new Request("http://x/api/projects/X/checklist", { method: "POST" }) as any,
      { params: Promise.resolve({ id: project.id }) },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("blockers_present");
  });
});
