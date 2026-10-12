-- Ensure a route edge cannot connect the same ordered pair of route nodes twice.
CREATE UNIQUE INDEX "RouteEdge_fromNodeId_toNodeId_key"
  ON "RouteEdge"("fromNodeId", "toNodeId");