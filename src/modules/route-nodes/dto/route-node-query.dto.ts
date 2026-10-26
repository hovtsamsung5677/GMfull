import { ApiPropertyOptional } from '@nestjs/swagger';
import { RouteNodeType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

export class RouteNodeQueryDto {
  @ApiPropertyOptional({ example: 'entrance' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional({ enum: RouteNodeType })
  @IsOptional()
  @IsEnum(RouteNodeType)
  type?: RouteNodeType;

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
