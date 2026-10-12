import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MapObjectType } from "@prisma/client";

class MapObjectFloorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;
}

class MapObjectStoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

class MapObjectCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class MapObjectResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: MapObjectType })
  type!: MapObjectType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  floorId!: string;

  @ApiPropertyOptional({ nullable: true })
  storeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  x!: number | null;

  @ApiPropertyOptional({ nullable: true })
  y!: number | null;

  @ApiPropertyOptional({ nullable: true })
  z!: number | null;

  @ApiPropertyOptional({ nullable: true })
  width!: number | null;

  @ApiPropertyOptional({ nullable: true })
  height!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rotationX!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rotationY!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rotationZ!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scaleX!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scaleY!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scaleZ!: number | null;

  @ApiPropertyOptional({ nullable: true })
  externalObjectId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Object,
    description:
      "Object geometry. This public/admin response field maps to Prisma geometry.",
  })
  polygonData!: unknown | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: MapObjectFloorResponseDto })
  floor?: MapObjectFloorResponseDto;

  @ApiPropertyOptional({ type: MapObjectStoreResponseDto, nullable: true })
  store?: MapObjectStoreResponseDto | null;

  @ApiPropertyOptional({ type: MapObjectCategoryResponseDto, nullable: true })
  category?: MapObjectCategoryResponseDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
