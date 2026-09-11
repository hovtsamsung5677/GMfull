import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteNodeType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

export class CreateRouteNodeDto {
  @ApiProperty({ description: 'Existing floor id for this navigation node.' })
  @IsString()
  floorId!: string;

  @ApiPropertyOptional({
    enum: RouteNodeType,
    default: RouteNodeType.ROUTE_POINT,
  })
  @IsOptional()
  @IsEnum(RouteNodeType)
  type?: RouteNodeType;

  @ApiPropertyOptional({ example: 'Entrance node' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'F1-ENTRANCE-1' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string;

  @ApiProperty({
    example: 120,
    description: 'X coordinate in the floor-local coordinate system.',
  })
  @Transform(toOptionalNumber)
  @IsInt()
  x!: number;

  @ApiProperty({
    example: 240,
    description: 'Y coordinate in the floor-local coordinate system.',
  })
  @Transform(toOptionalNumber)
  @IsInt()
  y!: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Optional Z coordinate used by a future 3D renderer.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  z?: number;

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
    nullable: true,
    description:
      'Existing MapObject id on the same floor. Used to anchor the route node to a map/3D object.',
  })
  @IsOptional()
  @IsString()
  mapObjectId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    description: 'Additional routing and frontend rendering settings.',
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
