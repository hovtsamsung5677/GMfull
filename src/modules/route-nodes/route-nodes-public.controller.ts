import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RouteGraphResponseDto } from './dto/route-graph-response.dto';
import { RouteNodeQueryDto } from './dto/route-node-query.dto';
import { RouteNodeResponseDto } from './dto/route-node-response.dto';
import { RouteNodesService } from './route-nodes.service';

@ApiTags('public/route-nodes')
@Controller()
export class RouteNodesPublicController {
  constructor(private readonly routeNodesService: RouteNodesService) {}

  @Get('public/route-nodes')
  @ApiOkResponse({ type: [RouteNodeResponseDto] })
  findAll(@Query() query: RouteNodeQueryDto) {
    return this.routeNodesService.findPublic(query);
  }

  @Get('public/floors/:floorId/route-nodes')
  @ApiOkResponse({ type: [RouteNodeResponseDto] })
  findByFloor(
    @Param('floorId') floorId: string,
    @Query() query: RouteNodeQueryDto,
  ) {
    return this.routeNodesService.findPublicByFloor(floorId, query);
  }

  @Get('public/floors/:floorId/evacuation-stairs')
  @ApiOperation({
    summary: 'List evacuation (fire) stairs marked on the floor.',
  })
  @ApiOkResponse({ type: [RouteNodeResponseDto] })
  @ApiNotFoundResponse({ description: 'Floor not found.' })
  findEvacuationStairs(@Param('floorId') floorId: string) {
    return this.routeNodesService.findEvacuationStairsByFloor(floorId);
  }

  @Get('public/floors/:floorId/route-graph')
  @ApiOkResponse({ type: RouteGraphResponseDto })
  findRouteGraph(@Param('floorId') floorId: string) {
    return this.routeNodesService.findPublicRouteGraph(floorId);
  }
}
