import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdAnalyticsAdminController } from "./ad-analytics-admin.controller";
import { AdAnalyticsService } from "./ad-analytics.service";
import { NavigationAnalyticsAdminController } from "./navigation-analytics-admin.controller";
import { NavigationAnalyticsService } from "./navigation-analytics.service";
import { PublicAnalyticsEventsController } from "./public-analytics-events.controller";
import { PublicAnalyticsEventsService } from "./public-analytics-events.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AdAnalyticsAdminController,
    NavigationAnalyticsAdminController,
    PublicAnalyticsEventsController,
  ],
  providers: [
    AdAnalyticsService,
    NavigationAnalyticsService,
    PublicAnalyticsEventsService,
  ],
})
export class AnalyticsModule {}
