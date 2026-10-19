import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdCampaignAssignmentsAdminController } from "./ad-campaign-assignments-admin.controller";
import { AdCampaignAssignmentsService } from "./ad-campaign-assignments.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdCampaignAssignmentsAdminController],
  providers: [AdCampaignAssignmentsService],
})
export class AdCampaignAssignmentsModule {}
