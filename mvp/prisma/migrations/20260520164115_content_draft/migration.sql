-- CreateEnum
CREATE TYPE "ContentDraftStatus" AS ENUM ('draft', 'in_review', 'client_review', 'published', 'archived');

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "channel" TEXT,
    "lens_id" TEXT,
    "narrator_id" TEXT,
    "language" TEXT NOT NULL DEFAULT 'it',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'draft',
    "plan_json" JSONB NOT NULL DEFAULT '{}',
    "verification_json" JSONB NOT NULL DEFAULT '{}',
    "citations_json" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_drafts_project_id_status_idx" ON "content_drafts"("project_id", "status");

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
