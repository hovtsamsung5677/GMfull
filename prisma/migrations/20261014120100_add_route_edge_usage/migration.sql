-- Track per-edge request frequency for adaptive routing.
-- Each row is a single RouteEdge counter for the current rolling window.
CREATE TABLE "RouteEdgeUsage" (
    "id" TEXT NOT NULL,
    "edgeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteEdgeUsage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RouteEdgeUsage_edgeId_key" UNIQUE ("edgeId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RouteEdgeUsage_windowStart_idx" ON "RouteEdgeUsage"("windowStart");
CREATE INDEX IF NOT EXISTS "RouteEdgeUsage_lastUsedAt_idx" ON "RouteEdgeUsage"("lastUsedAt");

-- AddForeignKey
ALTER TABLE "RouteEdgeUsage" ADD CONSTRAINT "RouteEdgeUsage_edgeId_fkey"
    FOREIGN KEY ("edgeId") REFERENCES "RouteEdge"("id") ON DELETE CASCADE ON UPDATE CASCADE;