import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

export class RouteEdgeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromNodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toNodeId?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200, default: 50 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
