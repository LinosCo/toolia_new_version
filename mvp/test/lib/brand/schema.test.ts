import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

describe("brand schema", () => {
  beforeEach(async () => { await resetDb(); });

  it("creates asset, evidence and a versioned skill", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    const asset = await prisma.brandAsset.create({
      data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", category: "PAST_CONTENT", content: "ciao", status: "READY" },
    });
    await prisma.brandEvidence.create({
      data: { projectId: project.id, assetId: asset.id, field: "palette.primary", value: "#112233", confidence: 0.8 },
    });
    const skill = await prisma.brandSkill.create({
      data: { projectId: project.id, version: 1, status: "CURRENT", manifest: { summary: "x" }, builtFromEvidenceIds: [] },
    });

    expect(asset.status).toBe("READY");
    const ev = await prisma.brandEvidence.findMany({ where: { assetId: asset.id } });
    expect(ev).toHaveLength(1);
    expect(skill.version).toBe(1);
  });
});
