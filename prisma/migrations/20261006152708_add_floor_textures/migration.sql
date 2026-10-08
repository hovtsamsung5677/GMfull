-- CreateTable
CREATE TABLE "FloorTexture" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "targetMesh" TEXT NOT NULL,
    "materialSlot" TEXT,
    "opacity" DOUBLE PRECISION DEFAULT 1,
    "blendMode" TEXT DEFAULT 'normal',
    "positionX" DOUBLE PRECISION DEFAULT 0,
    "positionY" DOUBLE PRECISION DEFAULT 0,
    "scaleX" DOUBLE PRECISION DEFAULT 1,
    "scaleY" DOUBLE PRECISION DEFAULT 1,
    "rotation" DOUBLE PRECISION DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorTexture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FloorTexture_floorId_idx" ON "FloorTexture"("floorId");

-- CreateIndex
CREATE INDEX "FloorTexture_assetId_idx" ON "FloorTexture"("assetId");

-- CreateIndex
CREATE INDEX "FloorTexture_floorId_isActive_sortOrder_idx" ON "FloorTexture"("floorId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "FloorTexture" ADD CONSTRAINT "FloorTexture_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorTexture" ADD CONSTRAINT "FloorTexture_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
