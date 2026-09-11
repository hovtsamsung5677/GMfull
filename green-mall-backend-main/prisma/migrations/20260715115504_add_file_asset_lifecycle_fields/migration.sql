-- CreateEnum
CREATE TYPE "FileAssetKind" AS ENUM ('IMAGE', 'VIDEO', 'MODEL_3D', 'DOCUMENT', 'OTHER');

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "kind" "FileAssetKind" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "FileAsset_isActive_idx" ON "FileAsset"("isActive");

-- CreateIndex
CREATE INDEX "FileAsset_kind_idx" ON "FileAsset"("kind");
