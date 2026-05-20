import { prisma } from "@/lib/db";
import { chunkText } from "@/lib/content/chunk";
import { createEmbeddings, EMBEDDING_MODEL, EMBEDDING_DIM } from "@/lib/content/embeddings";

type SourceType = "KB_FACT" | "POI_SEMANTIC" | "BRIEF" | "TENSION" | "SCHEDA" | "SOURCE";

const CHUNK = { size: 2000, overlap: 200 };

export interface IndexSourceArgs {
  tenantId: string;
  projectId: string;
  sourceType: SourceType;
  sourceId: string;
  text: string;
}

/** (Re)indicizza una singola sorgente: cancella i chunk vecchi, ricrea i nuovi. Ritorna il n. di chunk. */
export async function indexSource(args: IndexSourceArgs): Promise<number> {
  const { tenantId, projectId, sourceType, sourceId, text } = args;
  const chunks = chunkText(text, CHUNK);

  // Delete old chunks for this source
  await prisma.$executeRaw`
    DELETE FROM content_embeddings
    WHERE tenant_id = ${tenantId}
      AND project_id = ${projectId}
      AND source_type = ${sourceType}::"EmbeddingSourceType"
      AND source_id = ${sourceId}
  `;

  if (chunks.length === 0) return 0;

  const vectors = await createEmbeddings(chunks, { tenantId, projectId, operation: "content_index" });

  for (let i = 0; i < chunks.length; i++) {
    const vec = `[${vectors[i].join(",")}]`;
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO content_embeddings
        (id, tenant_id, project_id, source_type, source_id, chunk_index, content, embedding, model, dim, tokens, created_at)
      VALUES
        (${id}, ${tenantId}, ${projectId}, ${sourceType}::"EmbeddingSourceType", ${sourceId}, ${i}, ${chunks[i]}, ${vec}::vector, ${EMBEDDING_MODEL}, ${EMBEDDING_DIM}, 0, now())
    `;
  }
  return chunks.length;
}

/** Reindicizza tutti i KBFact approvati di un progetto. */
export async function indexProjectKB(args: { tenantId: string; projectId: string }): Promise<{ facts: number; chunks: number }> {
  const facts = await prisma.kBFact.findMany({
    where: { projectId: args.projectId, approved: true },
    select: { id: true, content: true, category: true },
  });

  let chunks = 0;
  for (const f of facts) {
    const text = `[${f.category}] ${f.content}`;
    chunks += await indexSource({
      tenantId: args.tenantId, projectId: args.projectId,
      sourceType: "KB_FACT", sourceId: f.id, text,
    });
  }
  return { facts: facts.length, chunks };
}
