-- CreateEnum
CREATE TYPE "FamilyMissionType" AS ENUM ('poi_observation', 'segment', 'sync');

-- AlterTable
ALTER TABLE "Path" ADD COLUMN     "bridgesJson" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "AssistantQA" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "poiId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'poi',
    "triggerQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAnswer" TEXT NOT NULL,
    "extendedAnswer" TEXT,
    "doNotAnswerBeyond" TEXT,
    "sessionRelevance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantQA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "missionType" "FamilyMissionType" NOT NULL DEFAULT 'poi_observation',
    "kidMissionBrief" TEXT NOT NULL,
    "clue" TEXT,
    "hintLadderJson" JSONB NOT NULL DEFAULT '[]',
    "reward" TEXT,
    "familyHandoff" TEXT,
    "characterCue" TEXT,
    "visualCue" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantQA_projectId_idx" ON "AssistantQA"("projectId");

-- CreateIndex
CREATE INDEX "AssistantQA_poiId_idx" ON "AssistantQA"("poiId");

-- CreateIndex
CREATE INDEX "FamilyMission_projectId_idx" ON "FamilyMission"("projectId");

-- CreateIndex
CREATE INDEX "FamilyMission_poiId_idx" ON "FamilyMission"("poiId");

-- AddForeignKey
ALTER TABLE "AssistantQA" ADD CONSTRAINT "AssistantQA_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantQA" ADD CONSTRAINT "AssistantQA_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "POI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMission" ADD CONSTRAINT "FamilyMission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMission" ADD CONSTRAINT "FamilyMission_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "POI"("id") ON DELETE CASCADE ON UPDATE CASCADE;
