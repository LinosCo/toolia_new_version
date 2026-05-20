-- CreateEnum
CREATE TYPE "MediaMode" AS ENUM ('GENERATION', 'PRESERVATION_EDIT', 'STYLE_TRANSFER', 'LAYOUT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('pending', 'generating', 'ready', 'failed', 'rejected');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mode" "MediaMode" NOT NULL,
    "prompt" TEXT,
    "source_url" TEXT,
    "output_url" TEXT,
    "model" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'pending',
    "identity_score" DOUBLE PRECISION,
    "identity_passed" BOOLEAN,
    "identity_notes" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_project_id_status_idx" ON "media_assets"("project_id", "status");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
