import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RouteEdgeQueryDto } from './dto/route-edge-query.dto';
import { RouteEdgeResponseDto } from './dto/route-edge-response.dto';
import { RouteEdgesService } from './route-edges.service';

@ApiTags('public/route-edges')
@Controller()
export class RouteEdgesPublicController {
  constructor(private readonly routeEdgesService: RouteEdgesService) {}

  @Get('public/route-edges')
  @ApiOkResponse({ type: [RouteEdgeResponseDto] })
  findAll(@Query() query: RouteEdgeQueryDto) {
    return this.routeEdgesService.findPublic(query);
  }

  @Get('public/floors/:floorId/route-edges')
  @ApiOkResponse({ type: [RouteEdgeResponseDto] })
  findByFloor(
    @Param('floorId') floorId: string,
    @Query() query: RouteEdgeQueryDto,
  ) {
    return this.routeEdgesService.findPublicByFloor(floorId, query);
  }
}
