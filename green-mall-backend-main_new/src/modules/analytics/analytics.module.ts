import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdAnalyticsAdminController } from "./ad-analytics-admin.controller";
import { AdAnalyticsService } from "./ad-analytics.service";
import { PublicAnalyticsEventsController } from "./public-analytics-events.controller";
import { PublicAnalyticsEventsService } from "./public-analytics-events.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdAnalyticsAdminController, PublicAnalyticsEventsController],
  providers: [AdAnalyticsService, PublicAnalyticsEventsService],
})
export class AnalyticsModule {}
