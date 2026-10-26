-- AlterTable
ALTER TABLE "Panel" ADD COLUMN "usedAt" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "Panel_usedAt_idx" ON "Panel"("usedAt");
