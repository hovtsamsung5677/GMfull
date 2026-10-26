import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PanelsService } from "./panels.service";
import { PanelPublicResponseDto } from "./dto/panel-public-response.dto";
import {
  PanelHeartbeatDto,
  PanelHeartbeatResponseDto,
} from "./dto/panel-heartbeat.dto";

@ApiTags("public/panels")
@Controller("public/panels")
export class PanelsPublicController {
  constructor(private readonly panelsService: PanelsService) {}

  @Get("by-node/:nodeId")
  @ApiOperation({
    summary: "Resolve the panel installed at a route node",
    description:
      "Public ingestion-time lookup for interactive panels; JWT is not required. Returns the safe short projection of the Panel whose start route node is the supplied nodeId, so a kiosk can attribute its analytics events. Returns 404 when no panel is assigned to the node.",
  })
  @ApiOkResponse({
    type: PanelPublicResponseDto,
    description: "The panel installed at the supplied route node.",
  })
  @ApiNotFoundResponse({
    description: "No panel is assigned to the supplied route node.",
  })
  findByRouteNodeId(
    @Param("nodeId") nodeId: string,
  ): Promise<PanelPublicResponseDto> {
    return this.panelsService.findPublicByRouteNodeId(nodeId);
  }

   @Post(":id/heartbeat")
  @HttpCode(200)
  @ApiOperation({
    summary: "Report panel liveness and optional runtime status",
    description:
      "Public, unauthenticated endpoint for a field panel to report its liveness. JWT is not required. The panel must be active. Refreshes lastSeenAt to the server time and, when supplied, updates appVersion and status. UsedAt is not modified by this endpoint (it is updated separately when a PANEL_USED event is recorded). Returns the resulting runtime state and the server processing timestamp. Panel status updates are also published to connected WebSocket clients in real time.",
  })
  @ApiOkResponse({
    type: PanelHeartbeatResponseDto,
    description: "Panel runtime state after the heartbeat.",
  })
  @ApiBadRequestResponse({
    description: "Invalid heartbeat payload.",
  })
  @ApiNotFoundResponse({
    description: "Panel was not found.",
  })
  heartbeat(
    @Param("id") id: string,
    @Body() dto: PanelHeartbeatDto,
  ): Promise<PanelHeartbeatResponseDto> {
    return this.panelsService.heartbeat(id, dto).then((result) => ({
      id: result.panel.id,
      code: result.panel.code,
      status: result.panel.status,
      lastSeenAt: result.panel.lastSeenAt,
      usedAt: result.panel.usedAt,
      processedAt: result.processedAt,
    }));
  }
}
