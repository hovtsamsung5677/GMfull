import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { toOptionalNumber } from '../../../common/transformers/query.transformers';

export class PublicPromotionQueryDto {
  @ApiPropertyOptional({
    description:
      'Return current promotions assigned to this active and visible store.',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, example: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
