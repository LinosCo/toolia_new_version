import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

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
