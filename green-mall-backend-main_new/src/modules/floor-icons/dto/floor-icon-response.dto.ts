import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileAssetKind } from '@prisma/client';

export class FloorIconResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'shop-icon.png' })
  name!: string;

  @ApiProperty({ example: 'floor_abc123' })
  floorId!: string;

  @ApiPropertyOptional({ example: 'store_xyz789', nullable: true })
  storeId?: string | null;

  @ApiProperty({ example: 'asset_456' })
  assetId!: string;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty({ example: 0 })
  z!: number;

  @ApiProperty({ example: 0 })
  rotation!: number;

  @ApiProperty({ example: 1 })
  scaleX!: number;

  @ApiProperty({ example: 1 })
  scaleY!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: '2026-09-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-19T12:00:00.000Z' })
  updatedAt!: Date;

  asset?: {
    id: string;
    filename: string;
    url: string;
    kind: FileAssetKind;
    isActive: boolean;
  } | null;
}
