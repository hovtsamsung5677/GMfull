import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { toOptionalBoolean } from '../../../common/transformers/query.transformers';

export class CreateStoreDto {
  @ApiProperty({ example: 'GREEN Coffee' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'green-coffee' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Existing floor id used to validate linked map objects and route nodes.',
  })
  @IsOptional()
  @IsString()
  floorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '1-105' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  roomNumber?: string;

  @ApiPropertyOptional({ example: '+79990000000' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'store@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  workingHours?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'coffee drinks cafe food',
    description: 'Search terms used by the public store search endpoint.',
  })
  @IsOptional()
  @IsString()
  searchKeywords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoAssetId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverAssetId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 200,
    description:
      'Exact MapObject id set to link to the store. On update, omit this field to preserve current links.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  mapObjectIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: 200,
    description:
      'Existing RouteNode ids to validate as store links. Each node must reference one of the linked map objects.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  routeNodeIds?: string[];

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Preferred existing MapObject id. It must be linked to this store. Send null to clear the preference.',
  })
  @IsOptional()
  @IsString()
  primaryMapObjectId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Preferred existing STORE_ANCHOR RouteNode id. It must be linked through a store map object.',
  })
  @IsOptional()
  @IsString()
  primaryRouteNodeId?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
