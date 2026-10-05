import { PartialType } from "@nestjs/swagger";
import { CreateAdCampaignDto } from "./create-ad-campaign.dto";

export class UpdateAdCampaignDto extends PartialType(CreateAdCampaignDto, {
  skipNullProperties: false,
}) {}
