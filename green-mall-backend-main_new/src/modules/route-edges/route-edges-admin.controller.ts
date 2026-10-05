import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateRouteEdgeDto } from "./dto/create-route-edge.dto";
import { RouteEdgeQueryDto } from "./dto/route-edge-query.dto";
import { RouteEdgeResponseDto } from "./dto/route-edge-response.dto";
import { UpdateRouteEdgeDto } from "./dto/update-route-edge.dto";
import { RouteEdgesService } from "./route-edges.service";

@ApiTags("admin/route-edges")
@ApiBearerAuth()
@Controller("admin/route-edges")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER")
export class RouteEdgesAdminController {
  constructor(private readonly routeEdgesService: RouteEdgesService) {}

  @Get()
  @ApiOperation({ summary: "List all route edges, including inactive edges." })
  @ApiOkResponse({ type: [RouteEdgeResponseDto] })
  findAll(@Query() query: RouteEdgeQueryDto) {
    return this.routeEdgesService.findAdmin(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one route edge for administration." })
  @ApiOkResponse({ type: RouteEdgeResponseDto })
  @ApiNotFoundResponse({ description: "Route edge not found." })
  findOne(@Param("id") id: string) {
    return this.routeEdgesService.findAdminOne(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a validated same-floor or vertical route edge",
    description:
      "WALKWAY requires floorId and two nodes on that floor. ELEVATOR, ESCALATOR and STAIRS require floorId=null, nodes on different floors and matching RouteNode types. The write is serializable with RouteNode floor/type updates.",
  })
  @ApiCreatedResponse({ type: RouteEdgeResponseDto })
  @ApiBadRequestResponse({
    description:
      "Nodes are equal, WALKWAY floor rules fail, or vertical floor/node-type rules fail.",
  })
  @ApiNotFoundResponse({
    description: "Referenced floor or route node not found.",
  })
  create(@Body() dto: CreateRouteEdgeDto) {
    return this.routeEdgesService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update route cost, direction, type and endpoints",
    description:
      "Validates the complete merged state. Omitted fields are preserved; explicit floorId=null is supported for vertical edges.",
  })
  @ApiOkResponse({ type: RouteEdgeResponseDto })
  @ApiBadRequestResponse({
    description:
      "Merged WALKWAY or vertical edge invariants are not satisfied.",
  })
  @ApiNotFoundResponse({
    description: "Route edge or referenced entity not found.",
  })
  update(@Param("id") id: string, @Body() dto: UpdateRouteEdgeDto) {
    return this.routeEdgesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-disable a route edge using isActive=false." })
  @ApiOkResponse({ type: RouteEdgeResponseDto })
  @ApiNotFoundResponse({ description: "Route edge not found." })
  remove(@Param("id") id: string) {
    return this.routeEdgesService.remove(id);
  }
}
