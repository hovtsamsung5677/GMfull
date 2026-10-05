-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN     "adSlotId" TEXT,
ADD COLUMN     "clientEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_clientEventId_key" ON "AnalyticsEvent"("clientEventId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_adSlotId_createdAt_idx" ON "AnalyticsEvent"("adSlotId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_adSlotId_fkey" FOREIGN KEY ("adSlotId") REFERENCES "AdSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
