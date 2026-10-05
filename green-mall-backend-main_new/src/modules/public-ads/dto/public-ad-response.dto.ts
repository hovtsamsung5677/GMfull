import { ApiProperty } from "@nestjs/swagger";
import { AdPlacement, AdTargetType } from "@prisma/client";
import { PublicFileAssetResponseDto } from "../../file-assets/dto/public-file-asset-response.dto";

export class PublicAdSlotResponseDto {
  @ApiProperty({ example: "main-panel-home" })
  code!: string;

  @ApiProperty({ enum: AdPlacement, enumName: "AdPlacement" })
  placement!: AdPlacement;
}

export class PublicAdStoreTargetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;
}

export class PublicAdPromotionTargetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;
}

export class PublicAdTargetResponseDto {
  @ApiProperty({ enum: AdTargetType, enumName: "AdTargetType" })
  type!: AdTargetType;

  @ApiProperty({
    type: () => PublicAdStoreTargetResponseDto,
    nullable: true,
  })
  store!: PublicAdStoreTargetResponseDto | null;

  @ApiProperty({
    type: () => PublicAdPromotionTargetResponseDto,
    nullable: true,
  })
  promotion!: PublicAdPromotionTargetResponseDto | null;

  @ApiProperty({ type: String, nullable: true })
  url!: string | null;
}

export class PublicAdCreativeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  title!: string | null;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  altText!: string | null;

  @ApiProperty({ type: String, nullable: true })
  ctaText!: string | null;

  @ApiProperty({ type: () => PublicFileAssetResponseDto })
  asset!: PublicFileAssetResponseDto;
}

export class PublicSelectedAdResponseDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty({ type: () => PublicAdCreativeResponseDto })
  creative!: PublicAdCreativeResponseDto;

  @ApiProperty({ type: () => PublicAdTargetResponseDto })
  target!: PublicAdTargetResponseDto;
}

export class PublicAdDeliveryResponseDto {
  @ApiProperty({ type: () => PublicAdSlotResponseDto })
  slot!: PublicAdSlotResponseDto;

  @ApiProperty({ type: () => PublicSelectedAdResponseDto, nullable: true })
  ad!: PublicSelectedAdResponseDto | null;
}
