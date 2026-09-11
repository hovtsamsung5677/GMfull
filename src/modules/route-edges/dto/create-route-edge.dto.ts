import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

export class CreateRouteEdgeDto {
  @ApiProperty({ description: 'Existing floor id shared by both route nodes.' })
  @IsString()
  floorId!: string;

  @ApiProperty({ description: 'Existing source RouteNode id.' })
  @IsString()
  fromNodeId!: string;

  @ApiProperty({ description: 'Existing target RouteNode id.' })
  @IsString()
  toNodeId!: string;

  @ApiPropertyOptional({
    example: 120,
    minimum: 1,
    description: 'Positive segment distance. Used when weight is not set.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  distance?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Positive Dijkstra cost. Takes precedence over distance.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'When true, the route can traverse this edge in both directions.',
  })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isBidirectional?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
