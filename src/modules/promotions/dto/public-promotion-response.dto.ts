import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FileAssetKind } from "@prisma/client";

export class PublicPromotionStoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  roomNumber!: string | null;
}

export class PublicPromotionImageAssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiPropertyOptional({ nullable: true })
  originalName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ nullable: true, description: "File size in bytes." })
  size!: number | null;

  @ApiProperty({ description: "Frontend-accessible image URL." })
  url!: string;

  @ApiProperty({ enum: FileAssetKind })
  kind!: FileAssetKind;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ format: "date-time" })
  updatedAt!: Date;
}

export class PublicPromotionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  terms!: string | null;

  @ApiPropertyOptional({ nullable: true })
  buttonText!: string | null;

  @ApiPropertyOptional({ nullable: true })
  buttonUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  startsAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    format: "date-time",
    description:
      "Exclusive validity boundary: the promotion is hidden when current time is equal to endsAt.",
  })
  endsAt!: Date | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({
    type: () => PublicPromotionStoreResponseDto,
    description: "Active and visible store linked to the promotion.",
  })
  store!: PublicPromotionStoreResponseDto;

  @ApiPropertyOptional({
    type: () => PublicPromotionImageAssetResponseDto,
    nullable: true,
    description:
      "Safe image projection, or null when the linked asset is inactive or not IMAGE.",
  })
  imageAsset!: PublicPromotionImageAssetResponseDto | null;
}
