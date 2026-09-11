import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FileAssetKind } from "@prisma/client";

export class FileAssetResponseDto {
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

  @ApiProperty({
    description: "Existing file URL; the backend does not upload it.",
  })
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  path!: string | null;

  @ApiPropertyOptional({ nullable: true })
  provider!: string | null;

  @ApiProperty({ enum: FileAssetKind })
  kind!: FileAssetKind;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiPropertyOptional({ nullable: true })
  uploadedById!: string | null;

  @ApiProperty({
    description: "Active floors using this asset as their 2D map.",
  })
  floorsMapCount!: number;

  @ApiProperty({
    description: "Active floors using this asset as their 3D model.",
  })
  floorsModelCount!: number;

  @ApiProperty({ description: "Active stores using this asset as their logo." })
  storesLogoCount!: number;

  @ApiProperty({
    description: "Active stores using this asset as their cover.",
  })
  storesCoverCount!: number;

  @ApiProperty({
    description: "Active tenants using this asset as their logo.",
  })
  tenantsLogoCount!: number;

  @ApiProperty({
    description:
      "Active, not deleted and unexpired promotions whose active store belongs to the same active tenant. Future promotions and temporarily hidden stores remain included.",
  })
  promotionsImageCount!: number;

  @ApiProperty({ description: "Active ad creatives using this asset." })
  adCreativesCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
