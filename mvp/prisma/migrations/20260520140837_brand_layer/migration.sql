-- CreateEnum
CREATE TYPE "BrandAssetKind" AS ENUM ('UPLOAD_IMAGE', 'UPLOAD_TEXT', 'URL_PAGE');

-- CreateEnum
CREATE TYPE "BrandAssetCategory" AS ENUM ('LOGO', 'COLOR_PALETTE', 'TYPOGRAPHY', 'BRAND_BOOK', 'PAST_CONTENT', 'MOODBOARD', 'PRODUCT_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "BrandAssetStatus" AS ENUM ('PENDING', 'EXTRACTING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BrandSkillStatus" AS ENUM ('CURRENT', 'SUPERSEDED', 'DRAFT');

-- DropIndex
DROP INDEX "Scheda_poiId_narratorId_language_key";

-- DropIndex
DROP INDEX "content_embeddings_embedding_idx";

-- CreateTable
CREATE TABLE "brand_assets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "label" TEXT,
    "kind" "BrandAssetKind" NOT NULL,
    "category" "BrandAssetCategory" NOT NULL DEFAULT 'OTHER',
    "status" "BrandAssetStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT,
    "mime_type" TEXT,
    "source_url" TEXT,
    "extractor_error" TEXT,
    "extracted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_evidence" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION,
    "source_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_skills" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BrandSkillStatus" NOT NULL DEFAULT 'CURRENT',
    "manifest" JSONB NOT NULL,
    "built_from_evidence_ids" JSONB NOT NULL,
    "distiller_model" TEXT,
    "distiller_tokens_in" INTEGER,
    "distiller_tokens_out" INTEGER,
    "distilled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_assets_project_id_idx" ON "brand_assets"("project_id");

-- CreateIndex
CREATE INDEX "brand_evidence_project_id_idx" ON "brand_evidence"("project_id");

-- CreateIndex
CREATE INDEX "brand_evidence_asset_id_idx" ON "brand_evidence"("asset_id");

-- CreateIndex
CREATE INDEX "brand_skills_project_id_status_idx" ON "brand_skills"("project_id", "status");

-- AddForeignKey
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_evidence" ADD CONSTRAINT "brand_evidence_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "brand_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_skills" ADD CONSTRAINT "brand_skills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
