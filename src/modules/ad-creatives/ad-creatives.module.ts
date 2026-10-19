import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdCampaignCreativesAdminController } from "./ad-campaign-creatives-admin.controller";
import { AdCreativesAdminController } from "./ad-creatives-admin.controller";
import { AdCreativesService } from "./ad-creatives.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdCampaignCreativesAdminController, AdCreativesAdminController],
  providers: [AdCreativesService],
})
export class AdCreativesModule {}
