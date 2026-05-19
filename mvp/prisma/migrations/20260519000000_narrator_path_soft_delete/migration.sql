-- AlterTable
ALTER TABLE "NarratorProfile" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Path" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
