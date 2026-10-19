import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PanelsService } from "./panels.service";
import { PanelPublicResponseDto } from "./dto/panel-public-response.dto";

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
}
