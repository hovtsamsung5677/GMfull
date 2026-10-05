import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteEdgeType } from "@prisma/client";
import { RouteNodeResponseDto } from "../../route-nodes/dto/route-node-response.dto";

class RouteEdgeFloorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;
}

export class RouteEdgeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RouteEdgeType })
  type!: RouteEdgeType;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Shared floor for WALKWAY. Null for ELEVATOR, ESCALATOR and STAIRS.",
  })
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

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: RouteEdgeFloorResponseDto, nullable: true })
  floor!: RouteEdgeFloorResponseDto | null;

  @ApiPropertyOptional({ type: RouteNodeResponseDto })
  fromNode?: RouteNodeResponseDto;

  @ApiPropertyOptional({ type: RouteNodeResponseDto })
  toNode?: RouteNodeResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
