import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

describe("ContentDraft.scheduledAt", () => {
  beforeEach(async () => { await resetDb(); });
  it("stores a scheduledAt date", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const when = new Date("2026-06-01T09:00:00Z");
    const d = await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "T", body: "B", scheduledAt: when } });
    expect(d.scheduledAt?.toISOString()).toBe(when.toISOString());
  });
});
