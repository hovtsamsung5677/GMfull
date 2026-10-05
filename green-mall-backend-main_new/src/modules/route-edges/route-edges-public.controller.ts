import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RouteEdgeQueryDto } from "./dto/route-edge-query.dto";
import { RouteEdgeResponseDto } from "./dto/route-edge-response.dto";
import { RouteEdgesService } from "./route-edges.service";

@ApiTags("public/route-edges")
@Controller()
export class RouteEdgesPublicController {
  constructor(private readonly routeEdgesService: RouteEdgesService) {}

  @Get("public/route-edges")
  @ApiOperation({
    summary: "List active usable route edges",
    description:
      "Returns active edges whose endpoint nodes are active. Supports type, floor, endpoint and pagination filters.",
  })
  @ApiOkResponse({ type: [RouteEdgeResponseDto] })
  findAll(@Query() query: RouteEdgeQueryDto) {
    return this.routeEdgesService.findPublic(query);
  }

  @Get("public/floors/:floorId/route-edges")
  @ApiOperation({
    summary: "List active route edges touching a floor",
    description:
      "Includes floor-local WALKWAY edges and vertical edges whose fromNode or toNode belongs to the selected floor.",
  })
  @ApiOkResponse({ type: [RouteEdgeResponseDto] })
  findByFloor(
    @Param("floorId") floorId: string,
    @Query() query: RouteEdgeQueryDto,
  ) {
    return this.routeEdgesService.findPublicByFloor(floorId, query);
  }
}
