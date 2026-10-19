import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdCampaignsAdminController } from "./ad-campaigns-admin.controller";
import { AdCampaignsService } from "./ad-campaigns.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdCampaignsAdminController],
  providers: [AdCampaignsService],
})
export class AdCampaignsModule {}
