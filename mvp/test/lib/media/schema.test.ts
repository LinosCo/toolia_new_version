import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

describe("MediaAsset schema", () => {
  beforeEach(async () => { await resetDb(); });
  it("stores a preservation-edit asset with identity check fields", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const m = await prisma.mediaAsset.create({
      data: { projectId: project.id, tenantId, mode: "PRESERVATION_EDIT", prompt: "schiarisci", sourceUrl: "data:...", outputUrl: "data:...", status: "ready", identityScore: 0.9, identityPassed: true },
    });
    expect(m.mode).toBe("PRESERVATION_EDIT");
    expect(m.identityPassed).toBe(true);
    expect(m.status).toBe("ready");
  });
});
