CREATE TABLE "NarrativeTension" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "mustTellJson" JSONB NOT NULL DEFAULT '[]',
  "niceToTellJson" JSONB NOT NULL DEFAULT '[]',
  "avoidJson" JSONB NOT NULL DEFAULT '[]',
  "verifyJson" JSONB NOT NULL DEFAULT '[]',
  "tensionsJson" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NarrativeTension_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NarrativeTension_projectId_key" UNIQUE ("projectId")
);
ALTER TABLE "NarrativeTension" ADD CONSTRAINT "NarrativeTension_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
