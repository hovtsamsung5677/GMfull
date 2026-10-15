-- Add EXIT as a valid RouteNodeType for emergency evacuation routing.
-- Existing rows are unaffected because EXIT was previously mapped to OTHER.
ALTER TABLE "RouteNode" ALTER COLUMN "type" DROP DEFAULT;

CREATE TYPE "RouteNodeType_new" AS ENUM (
  'ROUTE_POINT',
  'ENTRANCE',
  'EXIT',
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
  ALTER COLUMN "type" TYPE "RouteNodeType_new"
  USING (
    CASE "type"::text
      WHEN 'OTHER' THEN 'OTHER'
      ELSE "type"::text
    END
  )::"RouteNodeType_new";

DROP TYPE "RouteNodeType" CASCADE;

ALTER TYPE "RouteNodeType_new" RENAME TO "RouteNodeType";

ALTER TABLE "RouteNode" ALTER COLUMN "type" SET DEFAULT 'ROUTE_POINT'::"RouteNodeType";

-- Recreate dependent indexes/constraints that referenced the dropped type.
CREATE INDEX IF NOT EXISTS "RouteNode_floorId_type_idx" ON "RouteNode"("floorId", "type");