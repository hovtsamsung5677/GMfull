import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { BlockRouteDto } from "./dto/block-route.dto";
import {
  BlockEdgeResultDto,
  BlockNodeResultDto,
} from "./dto/block-result.dto";
import { RouteMaintenanceService } from "./route-maintenance.service";

@ApiTags("admin/route-maintenance")
@ApiBearerAuth()
@Controller("admin/route-maintenance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN")
export class RouteMaintenanceController {
  constructor(
    private readonly routeMaintenanceService: RouteMaintenanceService,
  ) {}

  @Get("edges/blocked")
  @ApiOperation({
    summary:
      "List all route edges currently blocked for maintenance (metadata.blocked=true).",
  })
  @ApiOkResponse({ type: [BlockEdgeResultDto] })
  listBlockedEdges(): Promise<BlockEdgeResultDto[]> {
    return this.routeMaintenanceService.listBlockedEdges();
  }

  @Get("nodes/blocked")
  @ApiOperation({
    summary:
      "List all route nodes currently blocked for maintenance (metadata.blocked=true).",
  })
  @ApiOkResponse({ type: [BlockNodeResultDto] })
  listBlockedNodes(): Promise<BlockNodeResultDto[]> {
    return this.routeMaintenanceService.listBlockedNodes();
  }

  @Post("edges/:edgeId/block")
  @ApiOperation({ summary: "Temporarily block a route edge." })
  @ApiOkResponse({ type: BlockEdgeResultDto })
  @ApiNotFoundResponse({ description: "Route edge not found." })
  blockEdge(
    @Param("edgeId") edgeId: string,
    @Body() dto: BlockRouteDto,
  ): Promise<BlockEdgeResultDto> {
    return this.routeMaintenanceService.blockEdge(edgeId, dto);
  }

  @Post("edges/:edgeId/unblock")
  @ApiOperation({ summary: "Remove a temporary block from a route edge." })
  @ApiOkResponse({ type: BlockEdgeResultDto })
  @ApiNotFoundResponse({ description: "Route edge not found." })
  unblockEdge(
    @Param("edgeId") edgeId: string,
  ): Promise<BlockEdgeResultDto> {
    return this.routeMaintenanceService.unblockEdge(edgeId);
  }

  @Post("nodes/:nodeId/block")
  @ApiOperation({ summary: "Temporarily block a route node (e.g. elevator on maintenance)." })
  @ApiOkResponse({ type: BlockNodeResultDto })
  @ApiNotFoundResponse({ description: "Route node not found." })
  blockNode(
    @Param("nodeId") nodeId: string,
    @Body() dto: BlockRouteDto,
  ): Promise<BlockNodeResultDto> {
    return this.routeMaintenanceService.blockNode(nodeId, dto);
  }

  @Post("nodes/:nodeId/unblock")
  @ApiOperation({ summary: "Remove a temporary block from a route node." })
  @ApiOkResponse({ type: BlockNodeResultDto })
  @ApiNotFoundResponse({ description: "Route node not found." })
  unblockNode(
    @Param("nodeId") nodeId: string,
  ): Promise<BlockNodeResultDto> {
    return this.routeMaintenanceService.unblockNode(nodeId);
  }
}