import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdAnalyticsService } from "./ad-analytics.service";
import {
  AdAnalyticsBreakdownQueryDto,
  AdAnalyticsQueryDto,
} from "./dto/ad-analytics-query.dto";
import {
  AdAnalyticsBreakdownResponseDto,
  AdAnalyticsSummaryResponseDto,
} from "./dto/ad-analytics-response.dto";

const AD_ANALYTICS_READ_ROLES = [
  "SUPER_ADMIN",
  "MALL_ADMIN",
  "ADS_MANAGER",
  "ANALYTICS_VIEWER",
];

@ApiTags("admin/analytics/ads")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description:
    "Allowed roles: SUPER_ADMIN, MALL_ADMIN, ADS_MANAGER and ANALYTICS_VIEWER.",
})
@Controller("admin/analytics/ads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AD_ANALYTICS_READ_ROLES)
export class AdAnalyticsAdminController {
  constructor(private readonly adAnalyticsService: AdAnalyticsService) {}

  @Get("summary")
  @ApiOperation({
    summary: "Get advertising analytics summary",
    description:
      "Aggregates AD_IMPRESSION and AD_CLICK AnalyticsEvent rows over the combined filters. The period is half-open: createdAt >= from and createdAt < to ([from, to)). Without filters, the complete available advertising event history is used. CTR is the clicks/impressions ratio, returns 0 when impressions are 0 and is not capped at 1.",
  })
  @ApiOkResponse({ type: AdAnalyticsSummaryResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid ISO date-time, source, query value, or a period where from is not earlier than to.",
  })
  getSummary(
    @Query() query: AdAnalyticsQueryDto,
  ): Promise<AdAnalyticsSummaryResponseDto> {
    return this.adAnalyticsService.getSummary(query);
  }

  @Get("breakdown")
  @ApiOperation({
    summary: "Get grouped advertising analytics",
    description:
      "Groups AD_IMPRESSION and AD_CLICK AnalyticsEvent rows by Campaign, Creative, Slot or Panel. Null identifiers are omitted because they cannot identify an entity. Entity projections are loaded in one batch after aggregation. Items are sorted by impressions DESC, clicks DESC and entityId ASC. The optional period uses [from, to), and CTR is an uncapped ratio.",
  })
  @ApiOkResponse({ type: AdAnalyticsBreakdownResponseDto })
  @ApiBadRequestResponse({
    description:
      "Missing/invalid groupBy, invalid ISO date-time, invalid source/query value, or a period where from is not earlier than to.",
  })
  getBreakdown(
    @Query() query: AdAnalyticsBreakdownQueryDto,
  ): Promise<AdAnalyticsBreakdownResponseDto> {
    return this.adAnalyticsService.getBreakdown(query);
  }
}
