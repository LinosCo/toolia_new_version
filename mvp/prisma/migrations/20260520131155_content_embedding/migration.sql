-- Enable pgvector extension (no-op if already exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "EmbeddingSourceType" AS ENUM ('KB_FACT', 'POI_SEMANTIC', 'BRIEF', 'TENSION', 'SCHEDA', 'SOURCE');

-- CreateTable
CREATE TABLE "content_embeddings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_type" "EmbeddingSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_embeddings_tenant_id_project_id_idx" ON "content_embeddings"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "content_embeddings_source_type_source_id_idx" ON "content_embeddings"("source_type", "source_id");

-- AddForeignKey
ALTER TABLE "content_embeddings" ADD CONSTRAINT "content_embeddings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (HNSW vector index for cosine similarity — Prisma cannot emit this for Unsupported columns)
CREATE INDEX "content_embeddings_embedding_idx"
  ON "content_embeddings" USING hnsw (embedding vector_cosine_ops);
