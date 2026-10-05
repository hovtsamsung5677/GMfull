import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MapObjectType, RouteEdgeType, RouteNodeType } from "@prisma/client";
import { PublicFileAssetResponseDto } from "../../file-assets/dto/public-file-asset-response.dto";

export class PublicMapSceneFloorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  width!: number | null;

  @ApiPropertyOptional({ nullable: true })
  height!: number | null;

  @ApiPropertyOptional({ nullable: true })
  depth!: number | null;

  @ApiPropertyOptional({ nullable: true })
  unit!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mapImageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mapAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  modelAssetId!: string | null;

  @ApiPropertyOptional({
    type: PublicFileAssetResponseDto,
    nullable: true,
    description: "Active public 2D floor-map asset, or null.",
  })
  mapAsset!: PublicFileAssetResponseDto | null;

  @ApiPropertyOptional({
    type: PublicFileAssetResponseDto,
    nullable: true,
    description: "Active public 3D floor-model asset, or null.",
  })
  modelAsset!: PublicFileAssetResponseDto | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;
}

export class PublicMapSceneObjectDto {
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

  @ApiPropertyOptional({ nullable: true, type: Object })
  polygonData!: unknown | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiProperty()
  sortOrder!: number;
}

export class PublicMapSceneRouteNodeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  floorId!: string;

  @ApiProperty({ enum: RouteNodeType })
  type!: RouteNodeType;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiPropertyOptional({ nullable: true })
  z!: number | null;

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
  mapObjectId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiProperty()
  sortOrder!: number;
}

export class PublicMapSceneRouteEdgeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RouteEdgeType })
  type!: RouteEdgeType;

  @ApiProperty({ type: String, nullable: true })
  floorId!: string | null;

  @ApiProperty()
  fromNodeId!: string;

  @ApiProperty()
  toNodeId!: string;

  @ApiProperty({ type: Number, nullable: true, minimum: 1 })
  distance!: number | null;

  @ApiProperty({ type: Number, nullable: true, minimum: 1 })
  weight!: number | null;

  @ApiProperty()
  isBidirectional!: boolean;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;
}

export class PublicMapSceneCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class PublicMapSceneStoreDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  roomNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  tenantId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  floorId!: string | null;

  @ApiProperty({ type: [String] })
  mapObjectIds!: string[];

  @ApiProperty({ type: [String] })
  routeNodeIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  primaryMapObjectId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  primaryRouteNodeId!: string | null;

  @ApiPropertyOptional({
    type: PublicFileAssetResponseDto,
    nullable: true,
    description: "Active public store logo asset, or null.",
  })
  logoAsset!: PublicFileAssetResponseDto | null;

  @ApiPropertyOptional({
    type: PublicFileAssetResponseDto,
    nullable: true,
    description: "Active public store cover asset, or null.",
  })
  coverAsset!: PublicFileAssetResponseDto | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  workingHours!: unknown | null;

  @ApiPropertyOptional({ nullable: true })
  searchKeywords!: string | null;
}

export class PublicMapSceneMetaDto {
  @ApiProperty({ example: "green-mall-map-scene/v1" })
  schemaVersion!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({
    example:
      "Frontend-ready 2D/3D mall map scene payload with navigation graph.",
  })
  purpose!: string;
}

export class PublicMapSceneResponseDto {
  @ApiProperty({ type: PublicMapSceneFloorDto })
  floor!: PublicMapSceneFloorDto;

  @ApiProperty({ type: [PublicMapSceneObjectDto] })
  objects!: PublicMapSceneObjectDto[];

  @ApiProperty({ type: [PublicMapSceneRouteNodeDto] })
  routeNodes!: PublicMapSceneRouteNodeDto[];

  @ApiProperty({ type: [PublicMapSceneRouteEdgeDto] })
  routeEdges!: PublicMapSceneRouteEdgeDto[];

  @ApiProperty({ type: [PublicMapSceneCategoryDto] })
  categories!: PublicMapSceneCategoryDto[];

  @ApiProperty({ type: [PublicMapSceneStoreDto] })
  stores!: PublicMapSceneStoreDto[];

  @ApiProperty({ type: PublicMapSceneMetaDto })
  meta!: PublicMapSceneMetaDto;
}
