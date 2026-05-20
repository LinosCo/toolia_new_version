import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

vi.mock("@/lib/content/retrieval", () => ({ retrieveContent: vi.fn() }));
vi.mock("@/lib/brand/skill", () => ({ getCurrentBrandSkill: vi.fn() }));

import { retrieveContent } from "@/lib/content/retrieval";
import { getCurrentBrandSkill } from "@/lib/brand/skill";
import { assembleContentContext } from "@/lib/content/brain/context";

describe("assembleContentContext", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("gathers facts, brand, tension, lens, narrator, brief", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.narrativeTension.create({ data: {
      projectId: project.id,
      mustTellJson: [{ title: "Affresco incompiuto", why: "domanda ricorrente", sourceIds: [] }],
      niceToTellJson: [], avoidJson: [{ topic: "prezzi", reason: "non pertinente" }], verifyJson: [], tensionsJson: [],
    } });
    const lens = await prisma.editorialLens.create({ data: { projectId: project.id, name: "Storico", description: "taglio storico", tone: "autorevole" } });
    const narrator = await prisma.narratorProfile.create({ data: { projectId: project.id, name: "Guida", kind: "backbone", voiceStyle: "caldo" } });
    // Brief requires obiettivo, obiettivoCliente, tipoEsperienza (non-null fields in schema)
    await prisma.brief.create({ data: {
      projectId: project.id,
      obiettivo: "coinvolgere il visitatore",
      obiettivoCliente: "aumentare le visite",
      tipoEsperienza: "culturale",
      contenutoJson: { tono: "evocativo", promessaNarrativa: "emozione", mustTell: ["storia"], avoid: ["tecnicismi"] },
    } });

    vi.mocked(retrieveContent).mockResolvedValue([{ id: "f1", sourceType: "KB_FACT", sourceId: "k1", chunkIndex: 0, content: "fatto", similarity: 0.9 }]);
    vi.mocked(getCurrentBrandSkill).mockResolvedValue({ id: "s1", version: 1, manifest: { tone: { descriptors: ["caldo"], citations: [] } } });

    const ctx = await assembleContentContext({ projectId: project.id, tenantId, format: "social_post", topic: "affresco", lensId: lens.id, narratorId: narrator.id });

    expect(ctx.facts).toHaveLength(1);
    expect(ctx.brand?.tone?.descriptors).toContain("caldo");
    expect(ctx.tension.mustTell[0].title).toBe("Affresco incompiuto");
    expect(ctx.tension.avoid[0].topic).toBe("prezzi");
    expect(ctx.lens?.name).toBe("Storico");
    expect(ctx.narrator?.name).toBe("Guida");
    expect(ctx.brief?.tono).toBe("evocativo");
    expect(retrieveContent).toHaveBeenCalledWith(expect.objectContaining({ tenantId, projectId: project.id, query: "affresco" }));
  });

  it("works with no lens/narrator/tension/brief (nulls/empties)", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(retrieveContent).mockResolvedValue([]);
    vi.mocked(getCurrentBrandSkill).mockResolvedValue(null);

    const ctx = await assembleContentContext({ projectId: project.id, tenantId, format: "article", topic: "x" });
    expect(ctx.facts).toEqual([]);
    expect(ctx.brand).toBeNull();
    expect(ctx.tension.mustTell).toEqual([]);
    expect(ctx.lens).toBeNull();
    expect(ctx.narrator).toBeNull();
    expect(ctx.brief).toBeNull();
  });
});
