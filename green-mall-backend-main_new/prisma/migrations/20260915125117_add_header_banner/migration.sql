-- CreateTable
CREATE TABLE "HeaderBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "linkUrl" TEXT,
    "assetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "placement" TEXT NOT NULL DEFAULT 'HEADER',
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeaderBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeaderBanner_isActive_sortOrder_idx" ON "HeaderBanner"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "HeaderBanner_placement_idx" ON "HeaderBanner"("placement");

-- CreateIndex
CREATE INDEX "HeaderBanner_deletedAt_idx" ON "HeaderBanner"("deletedAt");

-- CreateIndex
CREATE INDEX "HeaderBanner_createdById_idx" ON "HeaderBanner"("createdById");

-- CreateIndex
CREATE INDEX "HeaderBanner_updatedById_idx" ON "HeaderBanner"("updatedById");

-- CreateIndex
CREATE INDEX "SharedRoute_token_idx" ON "SharedRoute"("token");

-- AddForeignKey
ALTER TABLE "HeaderBanner" ADD CONSTRAINT "HeaderBanner_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeaderBanner" ADD CONSTRAINT "HeaderBanner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeaderBanner" ADD CONSTRAINT "HeaderBanner_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
