import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

export class CategoryQueryDto {
  @ApiPropertyOptional({ example: 'food' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filters categories by id.' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filters categories linked to stores or map objects on a floor.',
  })
  @IsOptional()
  @IsString()
  floorId?: string;

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

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
