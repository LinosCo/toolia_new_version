-- Enums
CREATE TYPE "NodeKind" AS ENUM ('accesso', 'bivio', 'transizione', 'rientro');
CREATE TYPE "SegmentKind" AS ENUM ('passaggio', 'ramo', 'loop', 'connessione');

-- MapNode
CREATE TABLE "MapNode" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "kind" "NodeKind" NOT NULL,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "planimetriaX" DOUBLE PRECISION,
  "planimetriaY" DOUBLE PRECISION,
  "label" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MapNode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MapNode_projectId_idx" ON "MapNode"("projectId");
ALTER TABLE "MapNode" ADD CONSTRAINT "MapNode_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Segment
CREATE TABLE "Segment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "toNodeId" TEXT NOT NULL,
  "kind" "SegmentKind" NOT NULL,
  "traversalSec" INTEGER,
  "detourCost" DOUBLE PRECISION,
  "poiIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "bidirectional" BOOLEAN NOT NULL DEFAULT true,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Segment_projectId_idx" ON "Segment"("projectId");
CREATE INDEX "Segment_fromNodeId_idx" ON "Segment"("fromNodeId");
CREATE INDEX "Segment_toNodeId_idx" ON "Segment"("toNodeId");
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_fromNodeId_fkey"
  FOREIGN KEY ("fromNodeId") REFERENCES "MapNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_toNodeId_fkey"
  FOREIGN KEY ("toNodeId") REFERENCES "MapNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- POI.nodeId
ALTER TABLE "POI" ADD COLUMN "nodeId" TEXT;
ALTER TABLE "POI" ADD CONSTRAINT "POI_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "MapNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "POI_nodeId_idx" ON "POI"("nodeId");
