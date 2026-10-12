import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FileAssetKind } from "@prisma/client";

export class PromotionAdminStoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isVisible!: boolean;
}

export class PromotionAdminTenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class PromotionAdminImageAssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiPropertyOptional({ nullable: true })
  originalName!: string | null;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;

  @ApiProperty({ enum: FileAssetKind })
  kind!: FileAssetKind;

  @ApiProperty()
  isActive!: boolean;
}

export class PromotionAdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;
}

export class PromotionAdminResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  terms!: string | null;

  @ApiPropertyOptional({ nullable: true })
  buttonText!: string | null;

  @ApiPropertyOptional({ nullable: true })
  buttonUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  tenantId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  storeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  startsAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  endsAt!: Date | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  deletedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  createdById!: string | null;

  @ApiPropertyOptional({ nullable: true })
  updatedById!: string | null;

  @ApiPropertyOptional({
    type: () => PromotionAdminTenantResponseDto,
    nullable: true,
  })
  tenant!: PromotionAdminTenantResponseDto | null;

  @ApiPropertyOptional({
    type: () => PromotionAdminStoreResponseDto,
    nullable: true,
  })
  store!: PromotionAdminStoreResponseDto | null;

  @ApiPropertyOptional({
    type: () => PromotionAdminImageAssetResponseDto,
    nullable: true,
  })
  imageAsset!: PromotionAdminImageAssetResponseDto | null;

  @ApiPropertyOptional({
    type: () => PromotionAdminUserResponseDto,
    nullable: true,
  })
  createdBy!: PromotionAdminUserResponseDto | null;

  @ApiPropertyOptional({
    type: () => PromotionAdminUserResponseDto,
    nullable: true,
  })
  updatedBy!: PromotionAdminUserResponseDto | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ format: "date-time" })
  updatedAt!: Date;
}
