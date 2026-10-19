import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NavigationAnalyticsDailyItemResponseDto {
  @ApiProperty({
    description: "UTC calendar day of the bucket in YYYY-MM-DD format.",
    example: "2026-10-12",
  })
  date!: string;

  @ApiProperty({
    description: "PANEL_USED events recorded on that day.",
    example: 128,
  })
  panelClicks!: number;

  @ApiProperty({
    description: "ROUTE_BUILT events recorded on that day.",
    example: 64,
  })
  routesBuilt!: number;

  @ApiProperty({
    description: "QR_SCANNED events recorded on that day.",
    example: 32,
  })
  qrScans!: number;

  @ApiProperty({
    description: "SESSION_STARTED events recorded on that day.",
    example: 96,
  })
  sessions!: number;
}

export class NavigationAnalyticsHourlyItemResponseDto {
  @ApiProperty({
    description: "Hour of the UTC day from 0 to 23.",
    example: 18,
  })
  hour!: number;

  @ApiProperty({
    description: "Total visitor/navigation events recorded in that hour bucket.",
    example: 240,
  })
  events!: number;
}

export class NavigationAnalyticsStoreResponseDto {
  @ApiProperty({ description: "Store identifier." })
  id!: string;

  @ApiProperty({ description: "Store name." })
  name!: string;

  @ApiProperty({ description: "Store slug." })
  slug!: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: "Floor number of the Store, or null when unassigned.",
  })
  floorNumber!: number | null;
}

export class NavigationAnalyticsRoutesByStoreItemResponseDto {
  @ApiProperty({ description: "Store identifier of the route destination." })
  storeId!: string;

  @ApiProperty({
    type: NavigationAnalyticsStoreResponseDto,
    nullable: true,
    description:
      "Safe short Store projection, or null when the Store no longer exists.",
  })
  store!: NavigationAnalyticsStoreResponseDto | null;

  @ApiProperty({
    description: "Number of ROUTE_BUILT events targeting that Store.",
    example: 17,
  })
  routesBuilt!: number;
}

export class NavigationAnalyticsSummaryResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Resolved inclusive start of the aggregated period.",
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Resolved exclusive end of the aggregated period.",
  })
  to!: string | null;

  @ApiProperty({
    description: "PANEL_USED events in the resolved period.",
    example: 512,
  })
  panelClicks!: number;

  @ApiProperty({
    description:
      "PANEL_USED events since 00:00:00 UTC of the current day (panel clicks per day).",
    example: 74,
  })
  panelClicksToday!: number;

  @ApiProperty({
    description: "Total ROUTE_BUILT events in the resolved period.",
    example: 311,
  })
  routesBuilt!: number;

  @ApiProperty({
    description: "Total QR_SCANNED events in the resolved period.",
    example: 96,
  })
  qrScans!: number;

  @ApiProperty({
    description: "Total SESSION_STARTED events in the resolved period.",
    example: 203,
  })
  sessionsStarted!: number;

  @ApiProperty({
    description: "Total MOBILE_OPENED events in the resolved period.",
    example: 120,
  })
  mobileOpened!: number;

  @ApiProperty({
    description: "Distinct non-null sessionId values in the resolved period.",
    example: 180,
  })
  uniqueSessions!: number;
}

export class NavigationAnalyticsDailyResponseDto {
  @ApiProperty({
    description: "Resolved inclusive start of the daily series.",
  })
  from!: string;

  @ApiProperty({
    description: "Resolved exclusive end of the daily series.",
  })
  to!: string;

  @ApiProperty({
    type: [NavigationAnalyticsDailyItemResponseDto],
    description:
      "One zero-filled bucket per UTC day of the resolved period, sorted ascending.",
  })
  items!: NavigationAnalyticsDailyItemResponseDto[];
}

export class NavigationAnalyticsHourlyResponseDto {
  @ApiProperty({
    description: "Resolved inclusive start of the hourly series.",
  })
  from!: string;

  @ApiProperty({
    description: "Resolved exclusive end of the hourly series.",
  })
  to!: string;

  @ApiProperty({
    type: [NavigationAnalyticsHourlyItemResponseDto],
    description:
      "Exactly 24 buckets for hours 0..23, including hours without events.",
  })
  items!: NavigationAnalyticsHourlyItemResponseDto[];
}

export class NavigationAnalyticsRoutesByStoreResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Resolved inclusive start of the aggregated period.",
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Resolved exclusive end of the aggregated period.",
  })
  to!: string | null;

  @ApiProperty({
    type: [NavigationAnalyticsRoutesByStoreItemResponseDto],
    description:
      "Stores ordered by routesBuilt DESC, storeId ASC. Stores without routes are not listed.",
  })
  items!: NavigationAnalyticsRoutesByStoreItemResponseDto[];
}
