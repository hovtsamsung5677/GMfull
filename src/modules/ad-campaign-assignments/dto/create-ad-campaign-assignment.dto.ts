import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsString, MinLength, ValidateIf } from "class-validator";

export class CreateAdCampaignAssignmentDto {
  @ApiProperty({
    description: "Existing non-deleted AdCampaign cuid.",
  })
  @IsString()
  @MinLength(1)
  campaignId!: string;

  @ApiProperty({
    description: "Existing non-deleted AdSlot cuid.",
  })
  @IsString()
  @MinLength(1)
  slotId!: string;

  @ApiPropertyOptional({
    default: true,
    description:
      "Active assignments require active, placement-compatible dependencies and a non-expired campaign.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
