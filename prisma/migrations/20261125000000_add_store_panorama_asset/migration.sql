ALTER TABLE "Store" ADD COLUMN "panoramaAssetId" TEXT;

CREATE INDEX "Store_panoramaAssetId_idx" ON "Store"("panoramaAssetId");

ALTER TABLE "Store"
ADD CONSTRAINT "Store_panoramaAssetId_fkey"
FOREIGN KEY ("panoramaAssetId") REFERENCES "FileAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
