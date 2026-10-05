import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { PublicAdEventsController } from "./public-ad-events.controller";
import { PublicAdEventsService } from "./public-ad-events.service";
import { PublicAdsController } from "./public-ads.controller";
import { PublicAdsService } from "./public-ads.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PublicAdsController, PublicAdEventsController],
  providers: [PublicAdsService, PublicAdEventsService],
})
export class PublicAdsModule {}
