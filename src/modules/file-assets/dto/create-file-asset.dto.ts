import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileAssetKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalNumber } from '../../../common/transformers/query.transformers';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFileAssetDto {
  @ApiProperty({
    example: 'first-floor.glb',
    description: 'Registry filename. This endpoint does not upload a file.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({
    example: 'https://cdn.example.com/maps/first-floor.glb',
    description:
      'Existing HTTP(S) or application-relative file URL. No file is uploaded by this API.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/|\/)/i, {
    message: 'url must be an HTTP(S) or application-relative URL',
  })
  url!: string;

  @ApiPropertyOptional({
    example: 'GREEN MALL first floor.glb',
    nullable: true,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalName?: string | null;

  @ApiPropertyOptional({ example: 'model/gltf-binary', nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string | null;

  @ApiPropertyOptional({
    example: 1048576,
    minimum: 0,
    maximum: 2147483647,
    nullable: true,
    description: 'File size in bytes when known.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  size?: number | null;

  @ApiPropertyOptional({
    example: 'maps/first-floor.glb',
    nullable: true,
    description: 'Optional provider-relative path or storage key.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  path?: string | null;

  @ApiPropertyOptional({
    example: 'external-cdn',
    nullable: true,
    description: 'Asset provider label; no storage integration is performed.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string | null;

  @ApiPropertyOptional({
    enum: FileAssetKind,
    default: FileAssetKind.OTHER,
    example: FileAssetKind.MODEL_3D,
  })
  @IsOptional()
  @IsEnum(FileAssetKind)
  kind?: FileAssetKind;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      'Optional rendering, dimensions, format or other asset-specific metadata.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
