import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdCampaignAssignmentsModule } from "./modules/ad-campaign-assignments/ad-campaign-assignments.module";
import { AdCampaignsModule } from "./modules/ad-campaigns/ad-campaigns.module";
import { AdCreativesModule } from "./modules/ad-creatives/ad-creatives.module";
import { AdSlotsModule } from "./modules/ad-slots/ad-slots.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { FileAssetsModule } from "./modules/file-assets/file-assets.module";
import { FloorsModule } from "./modules/floors/floors.module";
import { FloorIconsModule } from "./modules/floor-icons/floor-icons.module";
import { HeaderBannersModule } from "./modules/header-banners/header-banners.module";
import { HealthModule } from "./modules/health/health.module";
import { MapObjectsModule } from "./modules/map-objects/map-objects.module";
import { PanelsModule } from "./modules/panels/panels.module";
import { PromotionsModule } from "./modules/promotions/promotions.module";
import { PublicAdsModule } from "./modules/public-ads/public-ads.module";
import { SharedRoutesModule } from "./modules/shared-routes/shared-routes.module";
import { RouteEdgesModule } from "./modules/route-edges/route-edges.module";
import { RouteNodesModule } from "./modules/route-nodes/route-nodes.module";
import { RoutesModule } from "./modules/routes/routes.module";
import { RolesModule } from "./modules/roles/roles.module";
import { StoresModule } from "./modules/stores/stores.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
    AdCampaignAssignmentsModule,
    AdCampaignsModule,
    AdCreativesModule,
    AdSlotsModule,
    AnalyticsModule,
    UsersModule,
    RolesModule,
    FileAssetsModule,
    CategoriesModule,
    TenantsModule,
    StoresModule,
    FloorsModule,
    FloorIconsModule,
    MapObjectsModule,
    PanelsModule,
    PromotionsModule,
    PublicAdsModule,
    SharedRoutesModule,
    HeaderBannersModule,
    RouteNodesModule,
    RouteEdgesModule,
    RoutesModule,
  ],
})
export class AppModule {}
