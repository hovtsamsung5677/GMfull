import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteEdgeResponseDto } from "../../route-edges/dto/route-edge-response.dto";
import { RouteNodeResponseDto } from "../../route-nodes/dto/route-node-response.dto";

export class RoutePathPointDto {
  @ApiProperty()
  nodeId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  z!: number;

  @ApiProperty()
  floorId!: string;

  @ApiProperty()
  floorNumber!: number;

  @ApiPropertyOptional({ nullable: true })
  mapObjectId!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

class RouteSegmentPointDto {
  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  z!: number;
}

export class RouteFloorSegmentDto {
  @ApiProperty()
  floorNumber!: number;

  @ApiProperty()
  floorId!: string;

  @ApiProperty({ type: [RoutePathPointDto] })
  points!: RoutePathPointDto[];
}

export class RouteFloorChangeDto {
  @ApiProperty()
  fromFloor!: number;

  @ApiProperty()
  toFloor!: number;

  @ApiPropertyOptional({ nullable: true })
  fromFloorId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  toFloorId!: string | null;

  @ApiProperty()
  nodeCode!: string;

  @ApiProperty()
  type!: string;
}

export class RouteSegmentDto {
  @ApiProperty()
  edgeId!: string;

  @ApiProperty()
  fromNodeId!: string;

  @ApiProperty()
  toNodeId!: string;

  @ApiProperty({ type: RouteSegmentPointDto })
  from!: RouteSegmentPointDto;

  @ApiProperty({ type: RouteSegmentPointDto })
  to!: RouteSegmentPointDto;

  @ApiProperty()
  distance!: number;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  isBidirectional!: boolean;

  @ApiProperty()
  floorId!: string;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;
}

export class RouteInstructionDto {
  @ApiProperty()
  order!: number;

  @ApiProperty({ enum: ["START", "MOVE", "ARRIVE"] })
  type!: "START" | "MOVE" | "ARRIVE";

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  nodeId!: string;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  z!: number;
}

export class RouteRenderingMetaDto {
  @ApiProperty({ example: true })
  supports2D!: boolean;

  @ApiProperty({ example: true })
  supports3D!: boolean;

  @ApiProperty({ example: "mall-local" })
  coordinateSystem!: string;

  @ApiProperty({ example: true })
  usesXYZ!: boolean;
}

export class RouteMetaDto {
  @ApiProperty({ example: "green-mall-route-v2" })
  schemaVersion!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ example: "Frontend-ready route between navigation nodes" })
  purpose!: string;

  @ApiProperty({ type: RouteRenderingMetaDto })
  rendering!: RouteRenderingMetaDto;

  @ApiProperty({
    enum: ["normal", "emergency"],
    example: "normal",
    description: "Routing mode used for this build.",
  })
  mode!: "normal" | "emergency";

  @ApiPropertyOptional({
    nullable: true,
    description:
      "Active exit node id used as the target when mode=emergency.",
  })
  emergencyExitUsed!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      "Per-edge adaptive routing report: base vs effective weight and load count.",
    type: "object",
    additionalProperties: true,
  })
  routingReport!: Record<string, unknown> | null;
}

export class BuildRouteResponseDto {
  @ApiProperty({ type: RouteNodeResponseDto })
  fromNode!: RouteNodeResponseDto;

  @ApiProperty({ type: RouteNodeResponseDto })
  toNode!: RouteNodeResponseDto;

  @ApiProperty({ type: [RouteNodeResponseDto] })
  nodes!: RouteNodeResponseDto[];

  @ApiProperty({ type: [RouteEdgeResponseDto] })
  edges!: RouteEdgeResponseDto[];

  @ApiProperty({ example: 120 })
  totalDistance!: number;

  @ApiProperty({ example: 120 })
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

  @ApiProperty({ type: RouteMetaDto })
  meta!: RouteMetaDto;
}
