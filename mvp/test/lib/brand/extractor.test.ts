import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { extractBrandAsset } from "@/lib/brand/extractor";

describe("extractBrandAsset", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("extracts evidence rows and marks asset READY", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const asset = await prisma.brandAsset.create({ data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", content: "Tono caldo, colore #112233" } });

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ evidence: [
        { field: "palette.primary", value: "#112233", confidence: 0.9 },
        { field: "tone.descriptor", value: "caldo", confidence: 0.8 },
      ] }) } }],
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    });

    const res = await extractBrandAsset({ assetId: asset.id });

    expect(res.evidenceCount).toBe(2);
    expect(res.status).toBe("READY");
    const ev = await prisma.brandEvidence.findMany({ where: { assetId: asset.id } });
    expect(ev).toHaveLength(2);
    const updated = await prisma.brandAsset.findUnique({ where: { id: asset.id } });
    expect(updated?.status).toBe("READY");
  });

  it("replaces previous evidence on re-extract", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const asset = await prisma.brandAsset.create({ data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", content: "x" } });
    await prisma.brandEvidence.create({ data: { projectId: project.id, assetId: asset.id, field: "old", value: "stale" } });

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ evidence: [{ field: "tone.descriptor", value: "nuovo" }] }) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });

    await extractBrandAsset({ assetId: asset.id });
    const ev = await prisma.brandEvidence.findMany({ where: { assetId: asset.id } });
    expect(ev).toHaveLength(1);
    expect(ev[0].field).toBe("tone.descriptor");
  });

  it("marks FAILED when no API key", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const asset = await prisma.brandAsset.create({ data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", content: "x" } });
    vi.mocked(getTenantApiKey).mockResolvedValue(null);

    const res = await extractBrandAsset({ assetId: asset.id });
    expect(res.status).toBe("FAILED");
    const updated = await prisma.brandAsset.findUnique({ where: { id: asset.id } });
    expect(updated?.status).toBe("FAILED");
  });
});
