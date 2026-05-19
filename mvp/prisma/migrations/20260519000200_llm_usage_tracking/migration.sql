CREATE TABLE "LlmUsage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT,
  "operation" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "audioSeconds" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LlmUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LlmUsage_tenantId_createdAt_idx" ON "LlmUsage"("tenantId", "createdAt");
CREATE INDEX "LlmUsage_projectId_idx" ON "LlmUsage"("projectId");

ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
