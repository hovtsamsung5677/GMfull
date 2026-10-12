import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Public floor projection. Deliberately omits `isActive` so internal
 * activation state is not leaked through public endpoints.
 */
export class FloorPublicResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  mapImageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  width!: number | null;

  @ApiPropertyOptional({ nullable: true })
  height!: number | null;

  @ApiPropertyOptional({ nullable: true })
  depth!: number | null;

  @ApiPropertyOptional({ nullable: true })
  unit!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "FileAsset id of the 2D map prepared for frontend rendering.",
  })
  mapAssetId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "FileAsset id of the future 3D floor model.",
  })
  modelAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
