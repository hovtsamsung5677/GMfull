import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AdAnalyticsAdminController } from "./ad-analytics-admin.controller";
import { AdAnalyticsService } from "./ad-analytics.service";
import { NavigationAnalyticsAdminController } from "./navigation-analytics-admin.controller";
import { NavigationAnalyticsService } from "./navigation-analytics.service";
import { PublicAnalyticsEventsController } from "./public-analytics-events.controller";
import { PublicAnalyticsEventsService } from "./public-analytics-events.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AnalyticsController,
    AdAnalyticsAdminController,
    NavigationAnalyticsAdminController,
    PublicAnalyticsEventsController,
  ],
  providers: [
    AnalyticsService,
    AdAnalyticsService,
    NavigationAnalyticsService,
    PublicAnalyticsEventsService,
  ],
  exports: [AnalyticsService, AdAnalyticsService, NavigationAnalyticsService, PublicAnalyticsEventsService],
})
export class AnalyticsModule {}
