import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validate } from "./config/configuration";
import { AuthModule } from "./modules/auth/auth.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { FileAssetsModule } from "./modules/file-assets/file-assets.module";
import { FloorsModule } from "./modules/floors/floors.module";
import { FloorTexturesModule } from "./modules/floor-textures/floor-textures.module";
import { HealthModule } from "./modules/health/health.module";
import { MapObjectsModule } from "./modules/map-objects/map-objects.module";
import { PromotionsModule } from "./modules/promotions/promotions.module";
import { RouteEdgesModule } from "./modules/route-edges/route-edges.module";
import { RouteNodesModule } from "./modules/route-nodes/route-nodes.module";
import { RoutesModule } from "./modules/routes/routes.module";
import { RolesModule } from "./modules/roles/roles.module";
import { SharedRoutesModule } from "./modules/shared-routes/shared-routes.module";
import { StoresModule } from "./modules/stores/stores.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    FileAssetsModule,
    CategoriesModule,
    TenantsModule,
    StoresModule,
    FloorsModule,
    FloorTexturesModule,
    MapObjectsModule,
    PromotionsModule,
    RouteEdgesModule,
    RouteNodesModule,
    RoutesModule,
    SharedRoutesModule,
  ],
})
export class AppModule {}
