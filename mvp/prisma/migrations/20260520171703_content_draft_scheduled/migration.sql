-- AlterTable
ALTER TABLE "content_drafts" ADD COLUMN     "scheduled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "content_drafts_project_id_scheduled_at_idx" ON "content_drafts"("project_id", "scheduled_at");
