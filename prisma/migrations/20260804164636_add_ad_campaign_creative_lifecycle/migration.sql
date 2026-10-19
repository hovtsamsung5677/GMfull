BEGIN;

-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "AdCreative" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT;

-- AddCheckConstraint
ALTER TABLE "AdCampaign"
ADD CONSTRAINT "AdCampaign_valid_date_range"
CHECK (
  "startsAt" IS NULL
  OR "endsAt" IS NULL
  OR "startsAt" < "endsAt"
);

-- AddCheckConstraint
ALTER TABLE "AdCampaign"
ADD CONSTRAINT "AdCampaign_positive_impression_limit"
CHECK (
  "impressionLimit" IS NULL
  OR "impressionLimit" > 0
);

-- AddCheckConstraint
ALTER TABLE "AdCampaign"
ADD CONSTRAINT "AdCampaign_valid_target"
CHECK (
  (
    "targetType" = 'STORE'
    AND "targetStoreId" IS NOT NULL
    AND "targetPromotionId" IS NULL
    AND "targetUrl" IS NULL
  )
  OR (
    "targetType" = 'PROMOTION'
    AND "targetStoreId" IS NULL
    AND "targetPromotionId" IS NOT NULL
    AND "targetUrl" IS NULL
  )
  OR (
    "targetType" = 'URL'
    AND "targetStoreId" IS NULL
    AND "targetPromotionId" IS NULL
    AND "targetUrl" IS NOT NULL
  )
  OR (
    "targetType" = 'NONE'
    AND "targetStoreId" IS NULL
    AND "targetPromotionId" IS NULL
    AND "targetUrl" IS NULL
  )
);

-- CreateIndex
CREATE INDEX "AdCampaign_deletedAt_idx" ON "AdCampaign"("deletedAt");

-- CreateIndex
CREATE INDEX "AdCampaign_createdById_idx" ON "AdCampaign"("createdById");

-- CreateIndex
CREATE INDEX "AdCampaign_updatedById_idx" ON "AdCampaign"("updatedById");

-- CreateIndex
CREATE INDEX "AdCreative_deletedAt_idx" ON "AdCreative"("deletedAt");

-- CreateIndex
CREATE INDEX "AdCreative_createdById_idx" ON "AdCreative"("createdById");

-- CreateIndex
CREATE INDEX "AdCreative_updatedById_idx" ON "AdCreative"("updatedById");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
