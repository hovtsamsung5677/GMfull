-- CreateEnum
CREATE TYPE "RouteEdgeType" AS ENUM ('WALKWAY', 'ELEVATOR', 'ESCALATOR', 'STAIRS');

-- AlterTable
ALTER TABLE "RouteEdge" ADD COLUMN     "type" "RouteEdgeType" NOT NULL DEFAULT 'WALKWAY',
ALTER COLUMN "floorId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RouteEdge_type_idx" ON "RouteEdge"("type");
