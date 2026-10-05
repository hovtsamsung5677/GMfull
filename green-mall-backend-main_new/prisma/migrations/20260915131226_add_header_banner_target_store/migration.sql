-- AlterTable
ALTER TABLE "HeaderBanner" ADD COLUMN     "targetStoreId" TEXT;

-- CreateIndex
CREATE INDEX "HeaderBanner_targetStoreId_idx" ON "HeaderBanner"("targetStoreId");

-- AddForeignKey
ALTER TABLE "HeaderBanner" ADD CONSTRAINT "HeaderBanner_targetStoreId_fkey" FOREIGN KEY ("targetStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
