import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NavigationAnalyticsDailyItemResponseDto {
  @ApiProperty({
    description: 'UTC calendar day of the bucket in YYYY-MM-DD format.',
    example: '2026-10-12',
  })
  date!: string;

  @ApiProperty({
    description: 'PANEL_USED events recorded on that day.',
    example: 128,
  })
  panelClicks!: number;

  @ApiProperty({
    description: 'ROUTE_BUILT events recorded on that day.',
    example: 64,
  })
  routesBuilt!: number;

  @ApiProperty({
    description: 'QR_SCANNED events recorded on that day.',
    example: 32,
  })
  qrScans!: number;

  @ApiProperty({
    description: 'SESSION_STARTED events recorded on that day.',
    example: 96,
  })
  sessions!: number;
}

export class NavigationAnalyticsHourlyItemResponseDto {
  @ApiProperty({
    description: 'Hour of the UTC day from 0 to 23.',
    example: 18,
  })
  hour!: number;

  @ApiProperty({
    description: 'Total visitor/navigation events recorded in that hour bucket.',
    example: 240,
  })
  events!: number;
}

export class NavigationAnalyticsStoreResponseDto {
  @ApiProperty({ description: 'Store identifier.' })
  id!: string;

  @ApiProperty({ description: 'Store name.' })
  name!: string;

  @ApiProperty({ description: 'Store slug.' })
  slug!: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Floor number of the Store, or null when unassigned.',
  })
  floorNumber!: number | null;
}

export class NavigationAnalyticsRoutesByStoreItemResponseDto {
  @ApiProperty({ description: 'Store identifier of the route destination.' })
  storeId!: string;

  @ApiProperty({
    type: NavigationAnalyticsStoreResponseDto,
    nullable: true,
    description: 'Safe short Store projection, or null when the Store no longer exists.',
  })
  store!: NavigationAnalyticsStoreResponseDto | null;

  @ApiProperty({
    description: 'Number of ROUTE_BUILT events targeting that Store.',
    example: 17,
  })
  routesBuilt!: number;
}

export class NavigationAnalyticsSummaryResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved inclusive start of the aggregated period.',
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved exclusive end of the aggregated period.',
  })
  to!: string | null;

  @ApiProperty({
    description: 'PANEL_USED events in the resolved period.',
    example: 512,
  })
  panelClicks!: number;

  @ApiProperty({
    description: 'PANEL_USED events since 00:00:00 UTC of the current day (panel clicks per day).',
    example: 74,
  })
  panelClicksToday!: number;

  @ApiProperty({
    description: 'Total ROUTE_BUILT events in the resolved period.',
    example: 311,
  })
  routesBuilt!: number;

  @ApiProperty({
    description: 'Total QR_SCANNED events in the resolved period.',
    example: 96,
  })
  qrScans!: number;

  @ApiProperty({
    description: 'Total SESSION_STARTED events in the resolved period.',
    example: 203,
  })
  sessionsStarted!: number;

  @ApiProperty({
    description: 'Total MOBILE_OPENED events in the resolved period.',
    example: 120,
  })
  mobileOpened!: number;

  @ApiProperty({
    description: 'Distinct non-null sessionId values in the resolved period.',
    example: 180,
  })
  uniqueSessions!: number;
}

export class NavigationAnalyticsDailyResponseDto {
  @ApiProperty({
    description: 'Resolved inclusive start of the daily series.',
  })
  from!: string;

  @ApiProperty({
    description: 'Resolved exclusive end of the daily series.',
  })
  to!: string;

  @ApiProperty({
    type: [NavigationAnalyticsDailyItemResponseDto],
    description: 'One zero-filled bucket per UTC day of the resolved period, sorted ascending.',
  })
  items!: NavigationAnalyticsDailyItemResponseDto[];
}

export class NavigationAnalyticsHourlyResponseDto {
  @ApiProperty({
    description: 'Resolved inclusive start of the hourly series.',
  })
  from!: string;

  @ApiProperty({
    description: 'Resolved exclusive end of the hourly series.',
  })
  to!: string;

  @ApiProperty({
    type: [NavigationAnalyticsHourlyItemResponseDto],
    description: 'Exactly 24 buckets for hours 0..23, including hours without events.',
  })
  items!: NavigationAnalyticsHourlyItemResponseDto[];
}

export class NavigationAnalyticsRoutesByStoreResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved inclusive start of the aggregated period.',
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved exclusive end of the aggregated period.',
  })
  to!: string | null;

  @ApiProperty({
    type: [NavigationAnalyticsRoutesByStoreItemResponseDto],
    description:
      'Stores ordered by routesBuilt DESC, storeId ASC. Stores without routes are not listed.',
  })
  items!: NavigationAnalyticsRoutesByStoreItemResponseDto[];
}

export class NavigationAnalyticsPopularCategoryResponseDto {
  @ApiProperty({ description: 'Identifier of the selected Category.' })
  categoryId!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Category name when the category still exists.',
  })
  categoryName!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Category slug when the category still exists.',
  })
  categorySlug!: string | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description: 'Category active flag when the category still exists.',
  })
  categoryIsActive!: boolean | null;

  @ApiProperty({
    description: 'Number of CATEGORY_SELECTED events for this category.',
    example: 312,
  })
  selections!: number;
}

export class NavigationAnalyticsPopularCategoriesResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved inclusive start of the aggregated period.',
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved exclusive end of the aggregated period.',
  })
  to!: string | null;

  @ApiProperty({
    type: [NavigationAnalyticsPopularCategoryResponseDto],
    description:
      'Categories ordered by selections DESC, categoryId ASC. Categories without events are not listed.',
  })
  items!: NavigationAnalyticsPopularCategoryResponseDto[];
}

export class NavigationAnalyticsSearchQueryItemResponseDto {
  @ApiProperty({
    description: 'Distinct trimmed search query text.',
    example: 'coffee',
  })
  query!: string;

  @ApiProperty({
    description: 'Number of SEARCH_QUERY events recorded for this query text in the period.',
    example: 57,
  })
  count!: number;

  @ApiProperty({
    description: 'True when every recorded occurrence of this query had payload.resultCount === 0.',
    example: false,
  })
  noResults!: boolean;
}

export class NavigationAnalyticsSearchQueriesResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved inclusive start of the aggregated period.',
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved exclusive end of the aggregated period.',
  })
  to!: string | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description:
      'Whether the response was filtered to zero-result queries only (noResults=true request).',
  })
  noResultsFilter!: boolean | null;

  @ApiProperty({
    type: [NavigationAnalyticsSearchQueryItemResponseDto],
    description: 'Distinct search queries ordered by count DESC, query ASC.',
  })
  items!: NavigationAnalyticsSearchQueryItemResponseDto[];
}

export class NavigationAnalyticsCardToRouteConversionResponseDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved inclusive start of the aggregated period.',
  })
  from!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Resolved exclusive end of the aggregated period.',
  })
  to!: string | null;

  @ApiProperty({
    description: 'Number of STORE_CARD_VIEWED events in the period (funnel step 1).',
    example: 1400,
  })
  cardViews!: number;

  @ApiProperty({
    description:
      'Number of ROUTE_BUILT events whose sessionId also had a STORE_CARD_VIEWED event in the period (funnel step 2).',
    example: 312,
  })
  routesFromCardSessions!: number;

  @ApiProperty({
    description: 'Conversion rate: routesFromCardSessions / cardViews. 0 when cardViews is 0.',
    example: 0.223,
  })
  conversionRate!: number;
}
