import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { DatabaseModule } from "../../database/database.module";
import { SystemSettingsModule } from "../system-settings/system-settings.module";
import { RoutesPublicController } from "./routes-public.controller";
import { RoutesService } from "./routes.service";

@Module({
  imports: [DatabaseModule, AnalyticsModule, SystemSettingsModule],
  controllers: [RoutesPublicController],
  providers: [RoutesService],
})
export class RoutesModule {}