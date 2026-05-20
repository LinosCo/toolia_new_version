import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { distillBrandSkill } from "@/lib/brand/distiller";
import { getCurrentBrandSkill } from "@/lib/brand/skill";

async function seedEvidence(prisma: ReturnType<typeof getTestPrisma>, projectId: string, tenantId: string) {
  const asset = await prisma.brandAsset.create({ data: { projectId, tenantId, kind: "UPLOAD_TEXT", content: "x", status: "READY" } });
  await prisma.brandEvidence.createMany({ data: [
    { projectId, assetId: asset.id, field: "palette.primary", value: "#112233" },
    { projectId, assetId: asset.id, field: "tone.descriptor", value: "caldo" },
  ] });
}

describe("distillBrandSkill", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("creates v1 CURRENT skill from evidence", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await seedEvidence(prisma, project.id, tenantId);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ palette: { primary: "#112233", citations: [] }, tone: { descriptors: ["caldo"], citations: [] }, summary: "Brand" }) } }],
      usage: { prompt_tokens: 50, completion_tokens: 30 },
    });

    const res = await distillBrandSkill({ projectId: project.id, tenantId });
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.version).toBe(1); expect(res.manifest.summary).toBe("Brand"); }

    const current = await getCurrentBrandSkill(project.id);
    expect(current?.version).toBe(1);
    expect((current?.manifest as { palette?: { primary?: string } }).palette?.primary).toBe("#112233");
  });

  it("bumps version and supersedes the previous current", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await seedEvidence(prisma, project.id, tenantId);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ summary: "v" }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });

    await distillBrandSkill({ projectId: project.id, tenantId });
    const second = await distillBrandSkill({ projectId: project.id, tenantId });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.version).toBe(2);

    const all = await prisma.brandSkill.findMany({ where: { projectId: project.id }, orderBy: { version: "asc" } });
    expect(all.map((s) => s.status)).toEqual(["SUPERSEDED", "CURRENT"]);
  });

  it("fails when there is no evidence", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const res = await distillBrandSkill({ projectId: project.id, tenantId });
    expect(res.ok).toBe(false);
  });
});
