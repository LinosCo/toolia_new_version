-- ===== EditorialLens: ampliamento + drop campi vecchi =====

-- Drop old unique constraint
ALTER TABLE "EditorialLens" DROP CONSTRAINT IF EXISTS "EditorialLens_driverId_personaId_projectId_key";

-- Drop old FK constraints
ALTER TABLE "EditorialLens" DROP CONSTRAINT IF EXISTS "EditorialLens_driverId_fkey";
ALTER TABLE "EditorialLens" DROP CONSTRAINT IF EXISTS "EditorialLens_personaId_fkey";

-- Drop old columns
ALTER TABLE "EditorialLens" DROP COLUMN IF EXISTS "driverId";
ALTER TABLE "EditorialLens" DROP COLUMN IF EXISTS "personaId";

-- Add new columns
ALTER TABLE "EditorialLens" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Lens';
ALTER TABLE "EditorialLens" ADD COLUMN "primaryDriverId" TEXT;
ALTER TABLE "EditorialLens" ADD COLUMN "secondaryDriverIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "EditorialLens" ADD COLUMN "personaIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "EditorialLens" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EditorialLens" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EditorialLens" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove the defaults after setting (since they were temporary for ADD COLUMN safety)
ALTER TABLE "EditorialLens" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "EditorialLens" ALTER COLUMN "description" DROP DEFAULT;
ALTER TABLE "EditorialLens" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Add primaryDriverId FK
ALTER TABLE "EditorialLens" ADD CONSTRAINT "EditorialLens_primaryDriverId_fkey"
  FOREIGN KEY ("primaryDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== SchedaDepth enum =====
CREATE TYPE "SchedaDepth" AS ENUM ('primary', 'deep_dive');

-- ===== Scheda: aggiungere lensId + depth, cambiare unique =====
ALTER TABLE "Scheda" ADD COLUMN "lensId" TEXT;
ALTER TABLE "Scheda" ADD COLUMN "depth" "SchedaDepth" NOT NULL DEFAULT 'primary';

-- Drop old unique constraint
ALTER TABLE "Scheda" DROP CONSTRAINT IF EXISTS "Scheda_poiId_narratorId_language_key";

-- Add new unique constraint
-- Note: lensId is nullable; rows with lensId=NULL and same (poi, narrator, lang, depth) are treated as distinct by PG
-- For strict single-null uniqueness, a partial index would be needed. Accepted limitation for now.
ALTER TABLE "Scheda" ADD CONSTRAINT "Scheda_poiId_lensId_narratorId_language_depth_key"
  UNIQUE ("poiId", "lensId", "narratorId", "language", "depth");

-- FK for lensId
ALTER TABLE "Scheda" ADD CONSTRAINT "Scheda_lensId_fkey"
  FOREIGN KEY ("lensId") REFERENCES "EditorialLens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
