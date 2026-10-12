import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

  @ApiProperty()
  floorId!: string;

  @ApiProperty()
  fromNodeId!: string;

  @ApiProperty()
  toNodeId!: string;

  @ApiPropertyOptional({ nullable: true })
  distance!: number | null;

  @ApiPropertyOptional({ nullable: true })
  weight!: number | null;

  @ApiProperty()
  isBidirectional!: boolean;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: RouteEdgeFloorResponseDto })
  floor?: RouteEdgeFloorResponseDto;

  @ApiPropertyOptional({ type: RouteNodeResponseDto })
  fromNode?: RouteNodeResponseDto;

  @ApiPropertyOptional({ type: RouteNodeResponseDto })
  toNode?: RouteNodeResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
