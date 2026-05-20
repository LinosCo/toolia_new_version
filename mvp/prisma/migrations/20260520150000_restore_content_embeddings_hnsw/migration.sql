-- Re-create the pgvector HNSW index on content_embeddings.
-- WHY: Prisma cannot see the index (the `embedding` column is `Unsupported("vector(1536)")`),
-- so every `migrate dev` generates a spurious `DROP INDEX "content_embeddings_embedding_idx"`.
-- The brand_layer migration dropped it; this migration restores it idempotently.
-- For future migrations: remove the auto-generated DROP of this index, OR add a similar
-- re-create migration. See the "Prisma + pgvector recurring drop" note in the F2.1/F2.2 plans.
CREATE INDEX IF NOT EXISTS "content_embeddings_embedding_idx"
  ON "content_embeddings" USING hnsw (embedding vector_cosine_ops);
