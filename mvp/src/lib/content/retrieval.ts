import { prisma } from "@/lib/db";
import { createEmbeddings } from "@/lib/content/embeddings";

export interface RetrieveArgs {
  tenantId: string;
  projectId: string;
  query: string;
  topK?: number;
}

export interface RetrievalHit {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export async function retrieveContent(args: RetrieveArgs): Promise<RetrievalHit[]> {
  const topK = Math.min(Math.max(1, args.topK ?? 8), 50);
  const [queryVec] = await createEmbeddings([args.query], {
    tenantId: args.tenantId, projectId: args.projectId, operation: "content_retrieve",
  });
  const vec = `[${queryVec.join(",")}]`;

  const rows = await prisma.$queryRaw<RetrievalHit[]>`
    SELECT id,
           source_type AS "sourceType",
           source_id   AS "sourceId",
           chunk_index AS "chunkIndex",
           content,
           1 - (embedding <=> ${vec}::vector) AS similarity
    FROM content_embeddings
    WHERE tenant_id = ${args.tenantId} AND project_id = ${args.projectId}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${topK}
  `;
  return rows.map((r) => ({
    ...r,
    chunkIndex: Number(r.chunkIndex),
    similarity: Number(r.similarity),
  }));
}
