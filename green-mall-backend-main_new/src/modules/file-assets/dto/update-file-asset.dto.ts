import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toOptionalBoolean } from '../../../common/transformers/query.transformers';
import { CreateFileAssetDto } from './create-file-asset.dto';

export class UpdateFileAssetDto extends PartialType(CreateFileAssetDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Controls whether the asset can be used by backend entities.',
  })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
