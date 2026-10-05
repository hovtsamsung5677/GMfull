-- CreateTable
CREATE TABLE "AdSlot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "placement" "AdPlacement" NOT NULL,
    "panelId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdSlot_code_key" ON "AdSlot"("code");

-- CreateIndex
CREATE INDEX "AdSlot_placement_isActive_sortOrder_idx" ON "AdSlot"("placement", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "AdSlot_panelId_isActive_idx" ON "AdSlot"("panelId", "isActive");

-- CreateIndex
CREATE INDEX "AdSlot_deletedAt_idx" ON "AdSlot"("deletedAt");

-- CreateIndex
CREATE INDEX "AdSlot_createdById_idx" ON "AdSlot"("createdById");

-- CreateIndex
CREATE INDEX "AdSlot_updatedById_idx" ON "AdSlot"("updatedById");

-- AddForeignKey
ALTER TABLE "AdSlot" ADD CONSTRAINT "AdSlot_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSlot" ADD CONSTRAINT "AdSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSlot" ADD CONSTRAINT "AdSlot_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
