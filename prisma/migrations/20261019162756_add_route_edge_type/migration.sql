/*
  Warnings:

  - Made the column `opacity` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `blendMode` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `positionX` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `positionY` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `scaleX` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `scaleY` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rotation` on table `FloorTexture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `floorId` on table `RouteEdge` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RouteEdgeType" ADD VALUE 'TOILET';
ALTER TYPE "RouteEdgeType" ADD VALUE 'ENTRANCE';
ALTER TYPE "RouteEdgeType" ADD VALUE 'EXIT';
ALTER TYPE "RouteEdgeType" ADD VALUE 'OTHER';

-- DropIndex
DROP INDEX "RouteEdge_type_idx";

-- AlterTable
ALTER TABLE "FloorTexture" ALTER COLUMN "opacity" SET NOT NULL,
ALTER COLUMN "blendMode" SET NOT NULL,
ALTER COLUMN "positionX" SET NOT NULL,
ALTER COLUMN "positionY" SET NOT NULL,
ALTER COLUMN "scaleX" SET NOT NULL,
ALTER COLUMN "scaleY" SET NOT NULL,
ALTER COLUMN "rotation" SET NOT NULL;

-- AlterTable
ALTER TABLE "RouteEdge" ALTER COLUMN "floorId" SET NOT NULL;
