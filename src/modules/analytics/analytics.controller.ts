import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { EdgeUsageResponseDto } from "./dto/edge-usage.dto";
import { AnalyticsService } from "./analytics.service";

@ApiTags("admin/analytics")
@ApiBearerAuth()
@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN", "ANALYTICS_VIEWER")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("edge-usage")
  @ApiOperation({
    summary:
      "Get per-edge request counts within the rolling window for adaptive routing.",
  })
  @ApiOkResponse({ type: EdgeUsageResponseDto })
  async getEdgeUsage(
    @Query("floorId") floorId?: string,
  ): Promise<EdgeUsageResponseDto> {
    const edges = await this.analyticsService.getEdgeUsage(floorId);
    return {
      windowMs: 15 * 60 * 1000,
      generatedAt: new Date().toISOString(),
      edges,
    };
  }
}