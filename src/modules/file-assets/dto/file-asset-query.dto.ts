import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileAssetKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../common/transformers/query.transformers';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class FileAssetQueryDto {
  @ApiPropertyOptional({
    example: 'first floor',
    description: 'Searches filename, originalName and URL.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ example: 'model/gltf-binary' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;

  @ApiPropertyOptional({ example: 'external-cdn' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @ApiPropertyOptional({ enum: FileAssetKind })
  @IsOptional()
  @IsEnum(FileAssetKind)
  kind?: FileAssetKind;

  @ApiPropertyOptional({
    description: 'User id recorded when the asset was created.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  uploadedById?: string;

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
