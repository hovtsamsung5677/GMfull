import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class UpdateAdCampaignAssignmentDto {
  @ApiProperty({
    description:
      "Only publication state is mutable. campaignId and slotId cannot be changed.",
  })
  @IsBoolean()
  isActive!: boolean;
}
