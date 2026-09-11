BEGIN;

-- Add nullable columns first so existing Promotion rows remain valid.
ALTER TABLE "Promotion"
ADD COLUMN "slug" TEXT,
ADD COLUMN "terms" TEXT,
ADD COLUMN "buttonText" TEXT,
ADD COLUMN "buttonUrl" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT;

-- Generate a stable, unique public identifier for every existing row.
UPDATE "Promotion"
SET "slug" = 'promotion-' || "id"
WHERE "slug" IS NULL;

-- Enforce the required slug only after all existing rows have been backfilled.
ALTER TABLE "Promotion"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Promotion_slug_key" ON "Promotion"("slug");

-- Replace single-column tenant/store indexes with indexes serving scoped active queries.
CREATE INDEX "Promotion_imageAssetId_idx" ON "Promotion"("imageAssetId");
CREATE INDEX "Promotion_storeId_isActive_startsAt_endsAt_idx" ON "Promotion"("storeId", "isActive", "startsAt", "endsAt");
CREATE INDEX "Promotion_tenantId_isActive_startsAt_endsAt_idx" ON "Promotion"("tenantId", "isActive", "startsAt", "endsAt");
CREATE INDEX "Promotion_deletedAt_idx" ON "Promotion"("deletedAt");
CREATE INDEX "Promotion_createdById_idx" ON "Promotion"("createdById");
CREATE INDEX "Promotion_updatedById_idx" ON "Promotion"("updatedById");

DROP INDEX "Promotion_tenantId_idx";
DROP INDEX "Promotion_storeId_idx";

ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_valid_date_range"
CHECK (
  "startsAt" IS NULL
  OR "endsAt" IS NULL
  OR "startsAt" < "endsAt"
);

ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
