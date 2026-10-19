import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toOptionalNumber } from '../../../common/transformers/query.transformers';

export class CreateFloorIconDto {
  @ApiProperty({ example: 'shop-icon.png' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'floor_abc123' })
  @IsString()
  floorId!: string;

  @ApiPropertyOptional({ example: 'store_xyz789', nullable: true })
  @IsOptional()
  @IsString()
  storeId?: string | null;

  @ApiProperty({ example: 'asset_456' })
  @IsString()
  assetId!: string;

  @ApiProperty({ example: 120, description: 'X coordinate in floor-local plan units.' })
  @Transform(toOptionalNumber)
  @IsNumber()
  x!: number;

  @ApiProperty({ example: 240, description: 'Y coordinate in floor-local plan units.' })
  @Transform(toOptionalNumber)
  @IsNumber()
  y!: number;

  @ApiPropertyOptional({ example: 0, description: 'Z coordinate (height) in floor-local units.' })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  z?: number;

  @ApiPropertyOptional({ example: 0 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiPropertyOptional({ example: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  scaleX?: number;

  @ApiPropertyOptional({ example: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  scaleY?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
