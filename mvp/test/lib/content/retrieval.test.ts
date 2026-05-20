import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

vi.mock("@/lib/content/embeddings", async (orig) => {
  const actual = await orig<typeof import("@/lib/content/embeddings")>();
  return {
    ...actual,
    createEmbeddings: vi.fn(async (inputs: string[]) =>
      inputs.map((t) => {
        const v = new Array(actual.EMBEDDING_DIM).fill(0);
        const m = /axis:(\d+)/.exec(t);
        v[m ? Number(m[1]) : 0] = 1;
        return v;
      }),
    ),
  };
});

import { indexSource } from "@/lib/content/indexer";
import { retrieveContent } from "@/lib/content/retrieval";

describe("retrieveContent", () => {
  beforeEach(async () => { await resetDb(); });

  it("returns the most similar chunk first, scoped to tenant+project", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "a", text: "axis:0 contenuto A" });
    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "b", text: "axis:5 contenuto B" });

    const hits = await retrieveContent({ tenantId, projectId: project.id, query: "axis:5 cerco B", topK: 5 });
    expect(hits[0].sourceId).toBe("b");
    expect(hits[0].similarity).toBeGreaterThan(hits[1].similarity);
  });

  it("does not leak rows from another project", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const p1 = await prisma.project.create({ data: { tenantId, name: "P1" } });
    const p2 = await prisma.project.create({ data: { tenantId, name: "P2" } });
    await indexSource({ tenantId, projectId: p2.id, sourceType: "KB_FACT", sourceId: "x", text: "axis:1 altro progetto" });

    const hits = await retrieveContent({ tenantId, projectId: p1.id, query: "axis:1 q", topK: 5 });
    expect(hits).toHaveLength(0);
  });
});
