import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

vi.mock("@/lib/content/embeddings", async (orig) => {
  const actual = await orig<typeof import("@/lib/content/embeddings")>();
  return {
    ...actual,
    createEmbeddings: vi.fn(async (inputs: string[]) =>
      inputs.map((_, i) => {
        const v = new Array(actual.EMBEDDING_DIM).fill(0);
        v[i % actual.EMBEDDING_DIM] = 1;
        return v;
      }),
    ),
  };
});

import { indexSource, indexProjectKB } from "@/lib/content/indexer";

describe("pgvector foundation", () => {
  beforeEach(async () => { await resetDb(); });

  it("supports inserting and cosine-querying a vector", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    const vec = `[${Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0)).join(",")}]`;
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO content_embeddings
        (id, tenant_id, project_id, source_type, source_id, chunk_index, content, embedding, model, dim, tokens, created_at)
      VALUES
        (${id}, ${tenantId}, ${project.id}, 'KB_FACT', 'src1', 0, 'hello', ${vec}::vector, 'text-embedding-3-small', 1536, 3, now())
    `;

    const rows = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
      SELECT id, 1 - (embedding <=> ${vec}::vector) AS similarity
      FROM content_embeddings
      WHERE tenant_id = ${tenantId} AND project_id = ${project.id}
      ORDER BY embedding <=> ${vec}::vector
      LIMIT 1
    `;
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].similarity)).toBeCloseTo(1, 5);
  });
});

describe("indexSource", () => {
  beforeEach(async () => { await resetDb(); });

  it("chunks, embeds and stores rows for a source", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    const n = await indexSource({
      tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "fact1",
      text: "a".repeat(5000),
    });

    const stored = await prisma.contentEmbedding.findMany({ where: { sourceId: "fact1" } });
    expect(n).toBe(stored.length);
    expect(stored.length).toBeGreaterThan(1);
    expect(stored[0].model).toBe("text-embedding-3-small");
  });

  it("replaces old chunks on re-index (no duplicates)", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "f", text: "a".repeat(250) });
    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "f", text: "short" });

    const stored = await prisma.contentEmbedding.findMany({ where: { sourceId: "f" } });
    expect(stored.length).toBe(1);
    expect(stored[0].content).toBe("short");
  });

  it("indexProjectKB indexes only approved KBFacts", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.kBFact.create({ data: { projectId: project.id, content: "fatto approvato", category: "solido", approved: true } });
    await prisma.kBFact.create({ data: { projectId: project.id, content: "bozza", category: "solido", approved: false } });

    const res = await indexProjectKB({ tenantId, projectId: project.id });

    expect(res.facts).toBe(1);
    const stored = await prisma.contentEmbedding.findMany({ where: { projectId: project.id, sourceType: "KB_FACT" } });
    expect(stored.length).toBe(1);
    expect(stored[0].content).toContain("fatto approvato");
  });
});
