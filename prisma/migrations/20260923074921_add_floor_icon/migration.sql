-- CreateTable
CREATE TABLE "FloorIcon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "storeId" TEXT,
    "assetId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scaleX" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "scaleY" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorIcon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FloorIcon_floorId_idx" ON "FloorIcon"("floorId");

-- CreateIndex
CREATE INDEX "FloorIcon_storeId_idx" ON "FloorIcon"("storeId");

-- CreateIndex
CREATE INDEX "FloorIcon_assetId_idx" ON "FloorIcon"("assetId");

-- AddForeignKey
ALTER TABLE "FloorIcon" ADD CONSTRAINT "FloorIcon_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorIcon" ADD CONSTRAINT "FloorIcon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorIcon" ADD CONSTRAINT "FloorIcon_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
