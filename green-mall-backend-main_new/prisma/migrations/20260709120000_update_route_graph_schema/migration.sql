-- Update RouteNodeType values without losing existing compatible data.
ALTER TYPE "RouteNodeType" RENAME TO "RouteNodeType_old";

CREATE TYPE "RouteNodeType" AS ENUM (
  'ROUTE_POINT',
  'ENTRANCE',
  'PANEL',
  'STORE_ANCHOR',
  'ELEVATOR',
  'ESCALATOR',
  'STAIRS',
  'TOILET',
  'INFO_DESK',
  'OTHER'
);

ALTER TABLE "RouteNode"
  ALTER COLUMN "type" TYPE "RouteNodeType"
  USING (
    CASE "type"::text
      WHEN 'WALKWAY' THEN 'ROUTE_POINT'
      WHEN 'STORE_ENTRANCE' THEN 'STORE_ANCHOR'
      WHEN 'EXIT' THEN 'OTHER'
      ELSE "type"::text
    END
  )::"RouteNodeType";

DROP TYPE "RouteNodeType_old";

-- RouteNode contract update.
ALTER TABLE "RouteNode" DROP CONSTRAINT IF EXISTS "RouteNode_mapObjectId_fkey";
DROP INDEX IF EXISTS "RouteNode_mapObjectId_idx";

ALTER TABLE "RouteNode"
  DROP COLUMN IF EXISTS "mapObjectId",
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "type" SET DEFAULT 'ROUTE_POINT',
  ALTER COLUMN "x" TYPE INTEGER USING ROUND("x")::INTEGER,
  ALTER COLUMN "y" TYPE INTEGER USING ROUND("y")::INTEGER;

CREATE INDEX IF NOT EXISTS "RouteNode_code_idx" ON "RouteNode"("code");

-- RouteEdge contract update.
DROP INDEX IF EXISTS "RouteEdge_fromNodeId_toNodeId_key";

ALTER TABLE "RouteEdge"
  ADD COLUMN IF NOT EXISTS "floorId" TEXT,
  ADD COLUMN IF NOT EXISTS "isBidirectional" BOOLEAN NOT NULL DEFAULT true,
  ALTER COLUMN "distance" DROP NOT NULL,
  ALTER COLUMN "distance" TYPE INTEGER USING ROUND("distance")::INTEGER,
  ALTER COLUMN "weight" DROP DEFAULT,
  ALTER COLUMN "weight" DROP NOT NULL,
  ALTER COLUMN "weight" TYPE INTEGER USING ROUND("weight")::INTEGER;

UPDATE "RouteEdge"
SET "floorId" = "RouteNode"."floorId"
FROM "RouteNode"
WHERE "RouteEdge"."fromNodeId" = "RouteNode"."id"
  AND "RouteEdge"."floorId" IS NULL;

ALTER TABLE "RouteEdge" ALTER COLUMN "floorId" SET NOT NULL;

ALTER TABLE "RouteEdge"
  ADD CONSTRAINT "RouteEdge_floorId_fkey"
  FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "RouteEdge_floorId_idx" ON "RouteEdge"("floorId");
CREATE INDEX IF NOT EXISTS "RouteEdge_floorId_isActive_idx" ON "RouteEdge"("floorId", "isActive");
