import { BadRequestException, Injectable } from "@nestjs/common";
import { AnalyticsEventType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NavigationAnalyticsQueryDto } from "./dto/navigation-analytics-query.dto";
import {
  NavigationAnalyticsDailyItemResponseDto,
  NavigationAnalyticsDailyResponseDto,
  NavigationAnalyticsHourlyItemResponseDto,
  NavigationAnalyticsHourlyResponseDto,
  NavigationAnalyticsRoutesByStoreItemResponseDto,
  NavigationAnalyticsRoutesByStoreResponseDto,
  NavigationAnalyticsStoreResponseDto,
  NavigationAnalyticsSummaryResponseDto,
} from "./dto/navigation-analytics-response.dto";

const NAVIGATION_EVENT_TYPES = [
  AnalyticsEventType.SESSION_STARTED,
  AnalyticsEventType.SESSION_ENDED,
  AnalyticsEventType.SESSION_RESET,
  AnalyticsEventType.SEARCH_QUERY,
  AnalyticsEventType.CATEGORY_SELECTED,
  AnalyticsEventType.STORE_SELECTED,
  AnalyticsEventType.STORE_CARD_VIEWED,
  AnalyticsEventType.ROUTE_BUILT,
  AnalyticsEventType.QR_SCANNED,
  AnalyticsEventType.PROMOTION_VIEWED,
  AnalyticsEventType.MOBILE_OPENED,
  AnalyticsEventType.PANEL_USED,
] as const;

const DAILY_METRIC_TYPES: Partial<
  Record<AnalyticsEventType, keyof NavigationAnalyticsDailyItemResponseDto>
> = {
  [AnalyticsEventType.PANEL_USED]: "panelClicks",
  [AnalyticsEventType.ROUTE_BUILT]: "routesBuilt",
  [AnalyticsEventType.QR_SCANNED]: "qrScans",
  [AnalyticsEventType.SESSION_STARTED]: "sessions",
};

const DEFAULT_SERIES_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOURS_IN_DAY = 24;

interface DailyAggregateRow {
  day: Date;
  type: AnalyticsEventType;
  count: number;
}

interface HourlyAggregateRow {
  hour: number;
  count: number;
}

interface ResolvedPeriod {
  from: Date | null;
  to: Date | null;
}

interface ResolvedSeriesPeriod {
  from: Date;
  to: Date;
}

function emptyDailyItem(date: string): NavigationAnalyticsDailyItemResponseDto {
  return {
    date,
    panelClicks: 0,
    routesBuilt: 0,
    qrScans: 0,
    sessions: 0,
  };
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class NavigationAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsSummaryResponseDto> {
    const period = this.resolvePeriod(query);
    const where = this.buildWhere(query, period);
    const todayStart = this.currentUtcDayStart();

    const [
      panelClicks,
      routesBuilt,
      qrScans,
      sessionsStarted,
      mobileOpened,
      panelClicksToday,
      sessionRows,
    ] = await Promise.all([
      this.countByType(AnalyticsEventType.PANEL_USED, where),
      this.countByType(AnalyticsEventType.ROUTE_BUILT, where),
      this.countByType(AnalyticsEventType.QR_SCANNED, where),
      this.countByType(AnalyticsEventType.SESSION_STARTED, where),
      this.countByType(AnalyticsEventType.MOBILE_OPENED, where),
      this.countByType(AnalyticsEventType.PANEL_USED, {
        AND: [where, { createdAt: { gte: todayStart } }],
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ["sessionId"],
        where: { AND: [where, { sessionId: { not: null } }] },
      }),
    ]);

    return {
      from: period.from?.toISOString() ?? null,
      to: period.to?.toISOString() ?? null,
      panelClicks,
      panelClicksToday,
      routesBuilt,
      qrScans,
      sessionsStarted,
      mobileOpened,
      uniqueSessions: sessionRows.length,
    };
  }

  async getDaily(
    query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsDailyResponseDto> {
    const period = this.resolveSeriesPeriod(query);

    const rows = await this.prisma.$queryRaw<DailyAggregateRow[]>`
      SELECT date_trunc('day', "createdAt") AS "day",
             "type" AS "type",
             COUNT(*)::int AS "count"
      FROM "AnalyticsEvent"
      WHERE ${this.sqlEventTypeFilter()}
        AND "createdAt" >= ${period.from}
        AND "createdAt" < ${period.to}${this.sqlEntityFilters(query)}
      GROUP BY "day", "type"
      ORDER BY "day" ASC
    `;

    const buckets = new Map<string, NavigationAnalyticsDailyItemResponseDto>();
    for (let cursor = new Date(period.from); cursor < period.to; ) {
      const key = toUtcDateKey(cursor);
      buckets.set(key, emptyDailyItem(key));
      cursor = new Date(cursor.getTime() + DAY_MS);
    }

    for (const row of rows) {
      const bucket = buckets.get(toUtcDateKey(row.day));
      const metric = DAILY_METRIC_TYPES[row.type];

      if (bucket && metric) {
        switch (metric) {
          case "panelClicks":
            bucket.panelClicks += row.count;
            break;
          case "routesBuilt":
            bucket.routesBuilt += row.count;
            break;
          case "qrScans":
            bucket.qrScans += row.count;
            break;
          case "sessions":
            bucket.sessions += row.count;
            break;
        }
      }
    }

    return {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      items: [...buckets.values()],
    };
  }

  async getHourly(
    query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsHourlyResponseDto> {
    const period = this.resolveSeriesPeriod(query);

    const rows = await this.prisma.$queryRaw<HourlyAggregateRow[]>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int AS "hour",
             COUNT(*)::int AS "count"
      FROM "AnalyticsEvent"
      WHERE ${this.sqlEventTypeFilter()}
        AND "createdAt" >= ${period.from}
        AND "createdAt" < ${period.to}${this.sqlEntityFilters(query)}
      GROUP BY "hour"
      ORDER BY "hour" ASC
    `;

    const items: NavigationAnalyticsHourlyItemResponseDto[] = Array.from(
      { length: HOURS_IN_DAY },
      (_unused, hour) => ({ hour, events: 0 }),
    );

    for (const row of rows) {
      if (row.hour >= 0 && row.hour < HOURS_IN_DAY) {
        items[row.hour].events += row.count;
      }
    }

    return {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      items,
    };
  }

  async getRoutesByStore(
    query: NavigationAnalyticsQueryDto,
  ): Promise<NavigationAnalyticsRoutesByStoreResponseDto> {
    const period = this.resolvePeriod(query);
    const where = this.buildWhere(query, period);

    const rows = await this.prisma.analyticsEvent.groupBy({
      by: ["storeId"],
      where: {
        AND: [
          where,
          { type: AnalyticsEventType.ROUTE_BUILT, storeId: { not: null } },
        ],
      },
      _count: { _all: true },
    });

    const countsByStore = new Map<string, number>();
    for (const row of rows) {
      if (row.storeId !== null) {
        countsByStore.set(row.storeId, row._count._all);
      }
    }

    const storesById = await this.loadStores([...countsByStore.keys()]);

    const items: NavigationAnalyticsRoutesByStoreItemResponseDto[] = [
      ...countsByStore.entries(),
    ]
      .map(([storeId, routesBuilt]) => ({
        storeId,
        store: storesById.get(storeId) ?? null,
        routesBuilt,
      }))
      .sort(
        (left, right) =>
          right.routesBuilt - left.routesBuilt ||
          left.storeId.localeCompare(right.storeId),
      );

    return {
      from: period.from?.toISOString() ?? null,
      to: period.to?.toISOString() ?? null,
      items,
    };
  }

  private async countByType(
    type: AnalyticsEventType,
    where: Prisma.AnalyticsEventWhereInput,
  ): Promise<number> {
    return this.prisma.analyticsEvent.count({
      where: { AND: [where, { type }] },
    });
  }

  private async loadStores(
    ids: string[],
  ): Promise<Map<string, NavigationAnalyticsStoreResponseDto>> {
    if (ids.length === 0) {
      return new Map();
    }

    const stores = await this.prisma.store.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        slug: true,
        floor: { select: { number: true } },
      },
    });

    return new Map(
      stores.map((store) => [
        store.id,
        {
          id: store.id,
          name: store.name,
          slug: store.slug,
          floorNumber: store.floor?.number ?? null,
        },
      ]),
    );
  }

  private buildWhere(
    query: NavigationAnalyticsQueryDto,
    period: ResolvedPeriod,
  ): Prisma.AnalyticsEventWhereInput {
    const conditions: Prisma.AnalyticsEventWhereInput[] = [
      { type: { in: [...NAVIGATION_EVENT_TYPES] } },
    ];

    if (period.from !== null || period.to !== null) {
      conditions.push({
        createdAt: {
          ...(period.from !== null ? { gte: period.from } : {}),
          ...(period.to !== null ? { lt: period.to } : {}),
        },
      });
    }

    if (query.panelId) {
      conditions.push({ panelId: query.panelId });
    }

    if (query.source) {
      conditions.push({ source: query.source });
    }

    return { AND: conditions };
  }

  private sqlEventTypeFilter(): Prisma.Sql {
    return Prisma.sql`"type"::text IN (${Prisma.join([
      ...NAVIGATION_EVENT_TYPES,
    ])})`;
  }

  private sqlEntityFilters(query: NavigationAnalyticsQueryDto): Prisma.Sql {
    if (query.panelId && query.source) {
      return Prisma.sql` AND "panelId" = ${query.panelId} AND "source"::text = ${query.source}`;
    }

    if (query.panelId) {
      return Prisma.sql` AND "panelId" = ${query.panelId}`;
    }

    if (query.source) {
      return Prisma.sql` AND "source"::text = ${query.source}`;
    }

    return Prisma.empty;
  }

  private resolvePeriod(query: NavigationAnalyticsQueryDto): ResolvedPeriod {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    if (from !== null && to !== null && from.getTime() >= to.getTime()) {
      throw new BadRequestException("from must be earlier than to");
    }

    return { from, to };
  }

  private resolveSeriesPeriod(
    query: NavigationAnalyticsQueryDto,
  ): ResolvedSeriesPeriod {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_SERIES_DAYS * DAY_MS);

    if (from.getTime() >= to.getTime()) {
      throw new BadRequestException("from must be earlier than to");
    }

    return { from, to };
  }

  private currentUtcDayStart(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }
}
