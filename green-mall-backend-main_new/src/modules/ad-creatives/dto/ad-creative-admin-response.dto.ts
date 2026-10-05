import { ApiProperty } from "@nestjs/swagger";
import { AdPlacement, AdTargetType, FileAssetKind } from "@prisma/client";

export class AdCreativeAdminCampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: AdPlacement, enumName: "AdPlacement" })
  placement!: AdPlacement;

  @ApiProperty({ enum: AdTargetType, enumName: "AdTargetType" })
  targetType!: AdTargetType;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  endsAt!: Date | null;
}

export class AdCreativeAdminAssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty({ type: String, nullable: true })
  originalName!: string | null;

  @ApiProperty()
  url!: string;

  @ApiProperty({ type: String, nullable: true })
  mimeType!: string | null;

  @ApiProperty({ enum: FileAssetKind, enumName: "FileAssetKind" })
  kind!: FileAssetKind;

  @ApiProperty()
  isActive!: boolean;
}

export class AdCreativeAdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;
}

export class AdCreativeAdminResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty({ type: String, nullable: true })
  assetId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  title!: string | null;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  altText!: string | null;

  @ApiProperty({ type: String, nullable: true })
  ctaText!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ minimum: 0, maximum: 1_000_000 })
  sortOrder!: number;

  @ApiProperty({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: String, nullable: true })
  updatedById!: string | null;

  @ApiProperty({ type: () => AdCreativeAdminCampaignResponseDto })
  campaign!: AdCreativeAdminCampaignResponseDto;

  @ApiProperty({
    type: () => AdCreativeAdminAssetResponseDto,
    nullable: true,
  })
  asset!: AdCreativeAdminAssetResponseDto | null;

  @ApiProperty({
    type: () => AdCreativeAdminUserResponseDto,
    nullable: true,
  })
  createdBy!: AdCreativeAdminUserResponseDto | null;

  @ApiProperty({
    type: () => AdCreativeAdminUserResponseDto,
    nullable: true,
  })
  updatedBy!: AdCreativeAdminUserResponseDto | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class AdCreativePaginationMetaDto {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class AdCreativeAdminListResponseDto {
  @ApiProperty({ type: [AdCreativeAdminResponseDto] })
  items!: AdCreativeAdminResponseDto[];

  @ApiProperty({ type: AdCreativePaginationMetaDto })
  pagination!: AdCreativePaginationMetaDto;
}
