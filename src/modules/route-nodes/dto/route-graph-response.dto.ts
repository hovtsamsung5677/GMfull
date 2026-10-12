import { ApiProperty } from "@nestjs/swagger";
import { FloorPublicResponseDto } from "../../floors/dto/floor-public-response.dto";
import { RouteEdgeResponseDto } from "../../route-edges/dto/route-edge-response.dto";
import { RouteNodeResponseDto } from "./route-node-response.dto";

export class RouteGraphResponseDto {
  @ApiProperty({ type: FloorPublicResponseDto })
  floor!: FloorPublicResponseDto;

  @ApiProperty({ type: [RouteNodeResponseDto] })
  nodes!: RouteNodeResponseDto[];

  @ApiProperty({ type: [RouteEdgeResponseDto] })
  edges!: RouteEdgeResponseDto[];
}
