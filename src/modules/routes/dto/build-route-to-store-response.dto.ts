import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteEdgeResponseDto } from "../../route-edges/dto/route-edge-response.dto";
import { RouteNodeResponseDto } from "../../route-nodes/dto/route-node-response.dto";
import {
  RouteFloorChangeDto,
  RouteFloorSegmentDto,
  RouteInstructionDto,
  RoutePathPointDto,
  RouteRenderingMetaDto,
  RouteSegmentDto,
} from "./build-route-response.dto";

class RouteToStoreCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class RouteToStoreTargetStoreDto {
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

  @ApiPropertyOptional({ type: RouteToStoreCategoryDto, nullable: true })
  category!: RouteToStoreCategoryDto | null;

  @ApiProperty({ type: [String] })
  mapObjectIds!: string[];

  @ApiProperty({ type: [String] })
  routeNodeIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  primaryMapObjectId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  primaryRouteNodeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  searchKeywords!: string | null;
}

export class RouteToStoreMetaDto {
  @ApiProperty({ example: "green-mall-route-to-store-v2" })
  schemaVersion!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({
    example: "Frontend-ready route from navigation node to selected store",
  })
  purpose!: string;

  @ApiProperty({ type: RouteRenderingMetaDto })
  rendering!: RouteRenderingMetaDto;

  @ApiProperty({
    enum: ["normal", "emergency"],
    example: "normal",
    description: "Routing mode used for this build.",
  })
  mode!: "normal" | "emergency";

  @ApiPropertyOptional({ nullable: true })
  emergencyExitUsed!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  routingReport!: Record<string, unknown> | null;
}

export class BuildRouteToStoreResponseDto {
  @ApiProperty({ type: RouteNodeResponseDto })
  fromNode!: RouteNodeResponseDto;

  @ApiProperty({ type: RouteToStoreTargetStoreDto })
  targetStore!: RouteToStoreTargetStoreDto;

  @ApiProperty({ type: RouteNodeResponseDto })
  toNode!: RouteNodeResponseDto;

  @ApiProperty({ type: [RouteNodeResponseDto] })
  nodes!: RouteNodeResponseDto[];

  @ApiProperty({ type: [RouteEdgeResponseDto] })
  edges!: RouteEdgeResponseDto[];

  @ApiProperty()
  totalDistance!: number;

  @ApiProperty()
  totalWeight!: number;

  @ApiProperty({ type: [RoutePathPointDto] })
  routePath!: RoutePathPointDto[];

  @ApiProperty({ type: [RouteSegmentDto] })
  routeSegments!: RouteSegmentDto[];

  @ApiProperty({ type: [RouteFloorSegmentDto] })
  segments!: RouteFloorSegmentDto[];

  @ApiProperty({ type: [RouteFloorChangeDto] })
  floorChanges!: RouteFloorChangeDto[];

  @ApiProperty({ type: [RouteInstructionDto] })
  instructions!: RouteInstructionDto[];

  @ApiProperty({ type: RouteToStoreMetaDto })
  meta!: RouteToStoreMetaDto;
}
