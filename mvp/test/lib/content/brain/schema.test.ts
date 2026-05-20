import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

describe("content_drafts schema", () => {
  beforeEach(async () => { await resetDb(); });

  it("creates a draft with plan/verification json", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const d = await prisma.contentDraft.create({
      data: { projectId: project.id, tenantId, format: "social_post", language: "it", title: "T", body: "B", planJson: { coreMessage: "x" }, verificationJson: { passed: true }, citationsJson: ["e1"] },
    });
    expect(d.status).toBe("draft");
    expect((d.planJson as { coreMessage: string }).coreMessage).toBe("x");
  });
});
