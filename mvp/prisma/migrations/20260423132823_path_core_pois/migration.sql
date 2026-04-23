-- AlterTable
ALTER TABLE "Path" ADD COLUMN     "corePoiIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
