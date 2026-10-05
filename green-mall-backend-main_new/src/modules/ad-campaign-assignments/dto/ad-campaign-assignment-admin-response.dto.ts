import { ApiProperty } from "@nestjs/swagger";
import { AdPlacement } from "@prisma/client";

export class AdCampaignAssignmentCampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: AdPlacement, enumName: "AdPlacement" })
  placement!: AdPlacement;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  endsAt!: Date | null;

  @ApiProperty({ minimum: 0, maximum: 1_000_000 })
  priority!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 2_147_483_647,
  })
  impressionLimit!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;
}

export class AdCampaignAssignmentSlotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: AdPlacement, enumName: "AdPlacement" })
  placement!: AdPlacement;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Null identifies a global advertising slot.",
  })
  panelId!: string | null;

  @ApiProperty({ minimum: 0, maximum: 1_000_000 })
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;
}

export class AdCampaignAssignmentUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;
}

export class AdCampaignAssignmentAdminResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  slotId!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: String, nullable: true })
  updatedById!: string | null;

  @ApiProperty({ type: () => AdCampaignAssignmentCampaignResponseDto })
  campaign!: AdCampaignAssignmentCampaignResponseDto;

  @ApiProperty({ type: () => AdCampaignAssignmentSlotResponseDto })
  slot!: AdCampaignAssignmentSlotResponseDto;

  @ApiProperty({
    type: () => AdCampaignAssignmentUserResponseDto,
    nullable: true,
  })
  createdBy!: AdCampaignAssignmentUserResponseDto | null;

  @ApiProperty({
    type: () => AdCampaignAssignmentUserResponseDto,
    nullable: true,
  })
  updatedBy!: AdCampaignAssignmentUserResponseDto | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class AdCampaignAssignmentPaginationMetaDto {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class AdCampaignAssignmentAdminListResponseDto {
  @ApiProperty({ type: [AdCampaignAssignmentAdminResponseDto] })
  items!: AdCampaignAssignmentAdminResponseDto[];

  @ApiProperty({ type: AdCampaignAssignmentPaginationMetaDto })
  pagination!: AdCampaignAssignmentPaginationMetaDto;
}
