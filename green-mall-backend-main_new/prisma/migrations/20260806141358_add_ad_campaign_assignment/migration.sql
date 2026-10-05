-- CreateTable
CREATE TABLE "AdCampaignAssignment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaignAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCampaignAssignment_campaignId_isActive_deletedAt_idx" ON "AdCampaignAssignment"("campaignId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "AdCampaignAssignment_slotId_isActive_deletedAt_idx" ON "AdCampaignAssignment"("slotId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "AdCampaignAssignment_deletedAt_idx" ON "AdCampaignAssignment"("deletedAt");

-- CreateIndex
CREATE INDEX "AdCampaignAssignment_createdById_idx" ON "AdCampaignAssignment"("createdById");

-- CreateIndex
CREATE INDEX "AdCampaignAssignment_updatedById_idx" ON "AdCampaignAssignment"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaignAssignment_campaignId_slotId_key" ON "AdCampaignAssignment"("campaignId", "slotId");

-- AddForeignKey
ALTER TABLE "AdCampaignAssignment" ADD CONSTRAINT "AdCampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignAssignment" ADD CONSTRAINT "AdCampaignAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AdSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignAssignment" ADD CONSTRAINT "AdCampaignAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignAssignment" ADD CONSTRAINT "AdCampaignAssignment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
