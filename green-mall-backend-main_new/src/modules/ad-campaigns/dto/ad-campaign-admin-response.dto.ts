import { ApiProperty } from "@nestjs/swagger";
import { AdPlacement, AdTargetType } from "@prisma/client";

export class AdCampaignAdminTenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class AdCampaignAdminStoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isVisible!: boolean;
}

export class AdCampaignAdminPromotionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  storeId!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;
}

export class AdCampaignAdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;
}

export class AdCampaignAdminResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiProperty({ enum: AdPlacement, enumName: "AdPlacement" })
  placement!: AdPlacement;

  @ApiProperty({ enum: AdTargetType, enumName: "AdTargetType" })
  targetType!: AdTargetType;

  @ApiProperty({ type: String, nullable: true })
  targetStoreId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  targetPromotionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  targetUrl!: string | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  endsAt!: Date | null;

  @ApiProperty()
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

  @ApiProperty({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: String, nullable: true })
  updatedById!: string | null;

  @ApiProperty({
    type: () => AdCampaignAdminTenantResponseDto,
    nullable: true,
  })
  tenant!: AdCampaignAdminTenantResponseDto | null;

  @ApiProperty({
    type: () => AdCampaignAdminStoreResponseDto,
    nullable: true,
  })
  targetStore!: AdCampaignAdminStoreResponseDto | null;

  @ApiProperty({
    type: () => AdCampaignAdminPromotionResponseDto,
    nullable: true,
  })
  targetPromotion!: AdCampaignAdminPromotionResponseDto | null;

  @ApiProperty({
    type: () => AdCampaignAdminUserResponseDto,
    nullable: true,
  })
  createdBy!: AdCampaignAdminUserResponseDto | null;

  @ApiProperty({
    type: () => AdCampaignAdminUserResponseDto,
    nullable: true,
  })
  updatedBy!: AdCampaignAdminUserResponseDto | null;

  @ApiProperty({ minimum: 0 })
  creativesCount!: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class AdCampaignPaginationMetaDto {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class AdCampaignAdminListResponseDto {
  @ApiProperty({ type: [AdCampaignAdminResponseDto] })
  items!: AdCampaignAdminResponseDto[];

  @ApiProperty({ type: AdCampaignPaginationMetaDto })
  pagination!: AdCampaignPaginationMetaDto;
}
