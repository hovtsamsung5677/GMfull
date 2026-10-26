import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MapObjectType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

// Временный DTO для публичного (без авторизации) сохранения точек магазинов.
// TODO: убрать вместе с PublicMapObjectsController после включения авторизации.
export class PublicUpsertMapObjectDto {
  @ApiProperty({ enum: MapObjectType })
  @IsEnum(MapObjectType)
  type!: MapObjectType;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiProperty()
  @IsNumber()
  x!: number;

  @ApiProperty()
  @IsNumber()
  y!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  z?: number;
}
