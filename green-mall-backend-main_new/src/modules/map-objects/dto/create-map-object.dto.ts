import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MapObjectType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

export class CreateMapObjectDto {
  @ApiProperty({ enum: MapObjectType, example: MapObjectType.STORE })
  @IsEnum(MapObjectType)
  type!: MapObjectType;

  @ApiProperty({ example: 'Store 1-101' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  floorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiProperty({
    example: 120,
    description: 'X coordinate in the floor-local 2D/3D coordinate system.',
  })
  @Transform(toOptionalNumber)
  @IsNumber()
  x!: number;

  @ApiProperty({
    example: 240,
    description: 'Y coordinate in the floor-local 2D/3D coordinate system.',
  })
  @Transform(toOptionalNumber)
  @IsNumber()
  y!: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Optional Z coordinate for the future 3D scene.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  z?: number;

  @ApiPropertyOptional({
    example: 80,
    description: 'Object width in the floor unit.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @ApiPropertyOptional({
    example: 60,
    description: 'Object height in the floor unit.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Rotation around the X axis for a future 3D renderer.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  rotationX?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Rotation around the Y axis for a future 3D renderer.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  rotationY?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Rotation around the Z axis for 2D/3D rendering.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  rotationZ?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Optional scale multiplier on the X axis.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  scaleX?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Optional scale multiplier on the Y axis.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  scaleY?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Optional scale multiplier on the Z axis.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  scaleZ?: number;

  @ApiPropertyOptional({
    example: 'scene-floor-1-store-101',
    nullable: true,
    description:
      'Stable id used to match this backend object with a mesh/node in a future GLB, GLTF or FBX scene.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalObjectId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Canonical API field for 2D polygon data. Stored in Prisma as geometry.',
  })
  @IsOptional()
  @IsObject()
  polygonData?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Input alias for polygonData. Send either geometry or polygonData, not both.',
  })
  @IsOptional()
  @IsObject()
  geometry?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: Object,
    description: 'Additional frontend and future 3D rendering settings.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
