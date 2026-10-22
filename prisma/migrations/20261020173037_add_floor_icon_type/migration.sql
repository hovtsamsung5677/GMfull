-- CreateEnum
CREATE TYPE "FloorIconType" AS ENUM ('IMAGE', 'TEXT');

-- DropForeignKey
ALTER TABLE "FloorIcon" DROP CONSTRAINT "FloorIcon_assetId_fkey";

-- AlterTable
ALTER TABLE "FloorIcon" ADD COLUMN     "type" "FloorIconType" NOT NULL DEFAULT 'IMAGE',
ALTER COLUMN "assetId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FloorIcon" ADD CONSTRAINT "FloorIcon_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
