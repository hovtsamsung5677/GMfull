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
import { NavigationAnalyticsQueryDto } from "./dto/navigation-analytics-query.dto";
import {
  NavigationAnalyticsDailyResponseDto,
  NavigationAnalyticsHourlyResponseDto,
  NavigationAnalyticsRoutesByStoreResponseDto,
  NavigationAnalyticsSummaryResponseDto,
} from "./dto/navigation-analytics-response.dto";
import { NavigationAnalyticsService } from "./navigation-analytics.service";

const NAVIGATION_ANALYTICS_READ_ROLES = [
  "SUPER_ADMIN",
  "MALL_ADMIN",
  "ADS_MANAGER",
  "ANALYTICS_VIEWER",
];

@ApiTags("admin/analytics/navigation")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description:
    "Allowed roles: SUPER_ADMIN, MALL_ADMIN, ADS_MANAGER and ANALYTICS_VIEWER.",
})
@Controller("admin/analytics/navigation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...NAVIGATION_ANALYTICS_READ_ROLES)
export class NavigationAnalyticsAdminController {
  constructor(
    private readonly navigationAnalyticsService: NavigationAnalyticsService,
  ) {}

  @Get("summary")
  @ApiOperation({
    summary: "Get navigation analytics summary",
    description:
      "Aggregates visitor/navigation AnalyticsEvent rows over the combined filters. Without a period, the complete available history is used. panelClicksToday counts PANEL_USED events since 00:00:00 UTC of the current day, and uniqueSessions counts distinct non-null sessionId values.",
  })
  @ApiOkResponse({ type: NavigationAnalyticsSummaryResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid ISO date-time, source, or a period where from is not earlier than to.",
  })
  getSummary(
    @Query() query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsSummaryResponseDto> {
    return this.navigationAnalyticsService.getSummary(query);
  }

  @Get("daily")
  @ApiOperation({
    summary: "Get daily navigation activity series",
    description:
      "Groups PANEL_USED, ROUTE_BUILT, QR_SCANNED and SESSION_STARTED AnalyticsEvent rows by UTC calendar day over the period. The period is half-open [from, to), defaults to the last 30 days, and every day of the range is returned, zero-filled when it has no events.",
  })
  @ApiOkResponse({ type: NavigationAnalyticsDailyResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid ISO date-time, source, or a period where from is not earlier than to.",
  })
  getDaily(
    @Query() query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsDailyResponseDto> {
    return this.navigationAnalyticsService.getDaily(query);
  }

  @Get("hourly")
  @ApiOperation({
    summary: "Get hourly navigation activity series",
    description:
      "Groups visitor/navigation AnalyticsEvent rows by hour of the UTC day (0-23) over the period to show when the interactive stand is in highest demand. The period is half-open [from, to) and defaults to the last 30 days. All 24 buckets are always returned, zero-filled when they have no events.",
  })
  @ApiOkResponse({ type: NavigationAnalyticsHourlyResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid ISO date-time, source, or a period where from is not earlier than to.",
  })
  getHourly(
    @Query() query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsHourlyResponseDto> {
    return this.navigationAnalyticsService.getHourly(query);
  }

  @Get("routes-by-store")
  @ApiOperation({
    summary: "Get routes built grouped by destination store",
    description:
      "Groups ROUTE_BUILT AnalyticsEvent rows by Store over the combined filters. Items are sorted by routesBuilt DESC and storeId ASC, and use the safe short Store projection with floorNumber. Stores without route events are not listed.",
  })
  @ApiOkResponse({ type: NavigationAnalyticsRoutesByStoreResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid ISO date-time, source, or a period where from is not earlier than to.",
  })
  getRoutesByStore(
    @Query() query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsRoutesByStoreResponseDto> {
    return this.navigationAnalyticsService.getRoutesByStore(query);
  }
}
