-- CreateEnum
CREATE TYPE "NarratorKind" AS ENUM ('backbone', 'character');

-- AlterTable
ALTER TABLE "NarratorProfile" ADD COLUMN     "characterContractJson" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "kind" "NarratorKind" NOT NULL DEFAULT 'backbone',
ALTER COLUMN "language" SET DEFAULT 'it';
