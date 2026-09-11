import { ApiProperty } from '@nestjs/swagger';
import { FloorResponseDto } from '../../floors/dto/floor-response.dto';
import { RouteEdgeResponseDto } from '../../route-edges/dto/route-edge-response.dto';
import { RouteNodeResponseDto } from './route-node-response.dto';

export class RouteGraphResponseDto {
  @ApiProperty({ type: FloorResponseDto })
  floor!: FloorResponseDto;

  @ApiProperty({ type: [RouteNodeResponseDto] })
  nodes!: RouteNodeResponseDto[];

  @ApiProperty({ type: [RouteEdgeResponseDto] })
  edges!: RouteEdgeResponseDto[];
}
