-- CreateEnum
CREATE TYPE "PanelStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "MapObjectType" AS ENUM ('STORE', 'TOILET', 'ATM', 'ENTRANCE', 'EXIT', 'ELEVATOR', 'ESCALATOR', 'STAIRS', 'PARKING', 'INFO', 'FOODCOURT', 'REST_ZONE', 'AD_ZONE');

-- CreateEnum
CREATE TYPE "RouteNodeType" AS ENUM ('WALKWAY', 'PANEL', 'STORE_ENTRANCE', 'ELEVATOR', 'ESCALATOR', 'STAIRS', 'ENTRANCE', 'EXIT');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HOME_PANEL_BANNER', 'STORE_CARD_BANNER', 'PROMOTIONS_BANNER', 'MOBILE_HOME_BANNER');

-- CreateEnum
CREATE TYPE "AdTargetType" AS ENUM ('STORE', 'PROMOTION', 'URL', 'NONE');

-- CreateEnum
CREATE TYPE "AnalyticsSource" AS ENUM ('PANEL', 'MOBILE', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('SESSION_STARTED', 'SESSION_ENDED', 'SESSION_RESET', 'SEARCH_QUERY', 'CATEGORY_SELECTED', 'STORE_SELECTED', 'STORE_CARD_VIEWED', 'ROUTE_BUILT', 'QR_SCANNED', 'PROMOTION_VIEWED', 'AD_IMPRESSION', 'AD_CLICK', 'MOBILE_OPENED', 'PANEL_USED', 'DATA_LOAD_ERROR');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "categoryId" TEXT,
    "floorId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "roomNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "workingHours" JSONB,
    "searchKeywords" TEXT,
    "logoAssetId" TEXT,
    "coverAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mapAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapObject" (
    "id" TEXT NOT NULL,
    "type" "MapObjectType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "floorId" TEXT NOT NULL,
    "storeId" TEXT,
    "categoryId" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "geometry" JSONB,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PanelStatus" NOT NULL DEFAULT 'OFFLINE',
    "floorId" TEXT,
    "routeNodeId" TEXT,
    "location" JSONB,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteNode" (
    "id" TEXT NOT NULL,
    "type" "RouteNodeType" NOT NULL,
    "name" TEXT,
    "floorId" TEXT NOT NULL,
    "mapObjectId" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteEdge" (
    "id" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT,
    "storeId" TEXT,
    "imageAssetId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT,
    "placement" "AdPlacement" NOT NULL,
    "targetType" "AdTargetType" NOT NULL DEFAULT 'NONE',
    "targetStoreId" TEXT,
    "targetPromotionId" TEXT,
    "targetUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "impressionLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assetId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "altText" TEXT,
    "ctaText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "source" "AnalyticsSource" NOT NULL,
    "sessionId" TEXT,
    "panelId" TEXT,
    "storeId" TEXT,
    "categoryId" TEXT,
    "promotionId" TEXT,
    "campaignId" TEXT,
    "creativeId" TEXT,
    "query" TEXT,
    "qrToken" TEXT,
    "deviceData" JSONB,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "url" TEXT NOT NULL,
    "path" TEXT,
    "provider" TEXT,
    "metadata" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StoreAdditionalCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StoreAdditionalCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Role_name_idx" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Tenant_name_idx" ON "Tenant"("name");

-- CreateIndex
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_tenantId_idx" ON "Store"("tenantId");

-- CreateIndex
CREATE INDEX "Store_categoryId_idx" ON "Store"("categoryId");

-- CreateIndex
CREATE INDEX "Store_floorId_idx" ON "Store"("floorId");

-- CreateIndex
CREATE INDEX "Store_isActive_isVisible_idx" ON "Store"("isActive", "isVisible");

-- CreateIndex
CREATE INDEX "Store_name_idx" ON "Store"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_number_key" ON "Floor"("number");

-- CreateIndex
CREATE INDEX "Floor_number_idx" ON "Floor"("number");

-- CreateIndex
CREATE INDEX "Floor_isActive_sortOrder_idx" ON "Floor"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MapObject_floorId_idx" ON "MapObject"("floorId");

-- CreateIndex
CREATE INDEX "MapObject_floorId_type_idx" ON "MapObject"("floorId", "type");

-- CreateIndex
CREATE INDEX "MapObject_storeId_idx" ON "MapObject"("storeId");

-- CreateIndex
CREATE INDEX "MapObject_categoryId_idx" ON "MapObject"("categoryId");

-- CreateIndex
CREATE INDEX "MapObject_isActive_idx" ON "MapObject"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Panel_code_key" ON "Panel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Panel_routeNodeId_key" ON "Panel"("routeNodeId");

-- CreateIndex
CREATE INDEX "Panel_status_idx" ON "Panel"("status");

-- CreateIndex
CREATE INDEX "Panel_floorId_idx" ON "Panel"("floorId");

-- CreateIndex
CREATE INDEX "Panel_lastSeenAt_idx" ON "Panel"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Panel_isActive_idx" ON "Panel"("isActive");

-- CreateIndex
CREATE INDEX "RouteNode_floorId_idx" ON "RouteNode"("floorId");

-- CreateIndex
CREATE INDEX "RouteNode_floorId_type_idx" ON "RouteNode"("floorId", "type");

-- CreateIndex
CREATE INDEX "RouteNode_mapObjectId_idx" ON "RouteNode"("mapObjectId");

-- CreateIndex
CREATE INDEX "RouteNode_isActive_idx" ON "RouteNode"("isActive");

-- CreateIndex
CREATE INDEX "RouteEdge_fromNodeId_idx" ON "RouteEdge"("fromNodeId");

-- CreateIndex
CREATE INDEX "RouteEdge_toNodeId_idx" ON "RouteEdge"("toNodeId");

-- CreateIndex
CREATE INDEX "RouteEdge_isActive_idx" ON "RouteEdge"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RouteEdge_fromNodeId_toNodeId_key" ON "RouteEdge"("fromNodeId", "toNodeId");

-- CreateIndex
CREATE INDEX "Promotion_tenantId_idx" ON "Promotion"("tenantId");

-- CreateIndex
CREATE INDEX "Promotion_storeId_idx" ON "Promotion"("storeId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AdCampaign_tenantId_idx" ON "AdCampaign"("tenantId");

-- CreateIndex
CREATE INDEX "AdCampaign_placement_idx" ON "AdCampaign"("placement");

-- CreateIndex
CREATE INDEX "AdCampaign_targetType_idx" ON "AdCampaign"("targetType");

-- CreateIndex
CREATE INDEX "AdCampaign_targetStoreId_idx" ON "AdCampaign"("targetStoreId");

-- CreateIndex
CREATE INDEX "AdCampaign_targetPromotionId_idx" ON "AdCampaign"("targetPromotionId");

-- CreateIndex
CREATE INDEX "AdCampaign_isActive_startsAt_endsAt_idx" ON "AdCampaign"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AdCampaign_priority_idx" ON "AdCampaign"("priority");

-- CreateIndex
CREATE INDEX "AdCreative_campaignId_idx" ON "AdCreative"("campaignId");

-- CreateIndex
CREATE INDEX "AdCreative_assetId_idx" ON "AdCreative"("assetId");

-- CreateIndex
CREATE INDEX "AdCreative_isActive_sortOrder_idx" ON "AdCreative"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_source_createdAt_idx" ON "AnalyticsEvent"("source", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_panelId_createdAt_idx" ON "AnalyticsEvent"("panelId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_storeId_createdAt_idx" ON "AnalyticsEvent"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_categoryId_createdAt_idx" ON "AnalyticsEvent"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_promotionId_createdAt_idx" ON "AnalyticsEvent"("promotionId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_campaignId_createdAt_idx" ON "AnalyticsEvent"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_creativeId_createdAt_idx" ON "AnalyticsEvent"("creativeId", "createdAt");

-- CreateIndex
CREATE INDEX "FileAsset_uploadedById_idx" ON "FileAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "FileAsset_mimeType_idx" ON "FileAsset"("mimeType");

-- CreateIndex
CREATE INDEX "FileAsset_createdAt_idx" ON "FileAsset"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_isPublic_idx" ON "SystemSetting"("isPublic");

-- CreateIndex
CREATE INDEX "_StoreAdditionalCategories_B_index" ON "_StoreAdditionalCategories"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapObject" ADD CONSTRAINT "MapObject_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapObject" ADD CONSTRAINT "MapObject_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapObject" ADD CONSTRAINT "MapObject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_routeNodeId_fkey" FOREIGN KEY ("routeNodeId") REFERENCES "RouteNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteNode" ADD CONSTRAINT "RouteNode_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteNode" ADD CONSTRAINT "RouteNode_mapObjectId_fkey" FOREIGN KEY ("mapObjectId") REFERENCES "MapObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEdge" ADD CONSTRAINT "RouteEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "RouteNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEdge" ADD CONSTRAINT "RouteEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "RouteNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_targetStoreId_fkey" FOREIGN KEY ("targetStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_targetPromotionId_fkey" FOREIGN KEY ("targetPromotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreAdditionalCategories" ADD CONSTRAINT "_StoreAdditionalCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreAdditionalCategories" ADD CONSTRAINT "_StoreAdditionalCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
