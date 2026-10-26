import { BadRequestException } from "@nestjs/common";
import { AnalyticsEventType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NavigationAnalyticsService } from "./navigation-analytics.service";
import { NavigationAnalyticsReportsQueryDto } from "./dto/navigation-analytics-query.dto";

describe("NavigationAnalyticsService", () => {
  const prisma = {
    analyticsEvent: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    category: { findMany: jest.fn() },
    store: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const service = new NavigationAnalyticsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolvePeriod validation", () => {
    it("throws when from is not earlier than to on getPopularCategories", async () => {
      const query: NavigationAnalyticsReportsQueryDto = {
        from: "2026-10-13T00:00:00.000Z",
        to: "2026-10-13T00:00:00.000Z",
      };

      await expect(service.getPopularCategories(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.analyticsEvent.groupBy).not.toHaveBeenCalled();
    });

    it("throws when from is after to on getSearchQueries", async () => {
      const query: NavigationAnalyticsReportsQueryDto = {
        from: "2026-10-13T12:00:00.000Z",
        to: "2026-10-13T00:00:00.000Z",
      };

      await expect(service.getSearchQueries(query)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getSummary", () => {
    it("aggregates per-type counts and unique sessions, defaulting to full history", async () => {
      prisma.analyticsEvent.count
        .mockResolvedValueOnce(5) // PANEL_USED
        .mockResolvedValueOnce(3) // ROUTE_BUILT
        .mockResolvedValueOnce(7) // QR_SCANNED
        .mockResolvedValueOnce(10) // SESSION_STARTED
        .mockResolvedValueOnce(2) // MOBILE_OPENED
        .mockResolvedValueOnce(1); // PANEL_USED today
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { sessionId: "s1" },
        { sessionId: "s2" },
      ]);

      const summary = await service.getSummary({});

      expect(summary.from).toBeNull();
      expect(summary.to).toBeNull();
      expect(summary.panelClicks).toBe(5);
      expect(summary.routesBuilt).toBe(3);
      expect(summary.qrScans).toBe(7);
      expect(summary.sessionsStarted).toBe(10);
      expect(summary.mobileOpened).toBe(2);
      expect(summary.panelClicksToday).toBe(1);
      expect(summary.uniqueSessions).toBe(2);
    });
  });

  describe("getDaily", () => {
    it("zero-fills every day in the range and maps rows to metric buckets", async () => {
      const from = "2026-10-01T00:00:00.000Z";
      const to = "2026-10-03T00:00:00.000Z";
      const day1 = new Date("2026-10-01T00:00:00.000Z");
      prisma.$queryRaw.mockResolvedValue([
        { day: day1, type: AnalyticsEventType.PANEL_USED, count: 4 },
        { day: day1, type: AnalyticsEventType.ROUTE_BUILT, count: 2 },
      ]);

      const report = await service.getDaily({ from, to });

      expect(report.from).toBe(from);
      expect(report.to).toBe(to);
      expect(report.items).toHaveLength(2);
      expect(report.items[0]).toEqual({
        date: "2026-10-01",
        panelClicks: 4,
        routesBuilt: 2,
        qrScans: 0,
        sessions: 0,
      });
      expect(report.items[1]).toEqual({
        date: "2026-10-02",
        panelClicks: 0,
        routesBuilt: 0,
        qrScans: 0,
        sessions: 0,
      });
    });

    it("ignores unrecognized event types in the daily aggregate", async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          day: new Date("2026-10-01T00:00:00.000Z"),
          type: AnalyticsEventType.MOBILE_OPENED,
          count: 9,
        },
      ]);

      const report = await service.getDaily({
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-02T00:00:00.000Z",
      });

      expect(report.items[0].panelClicks).toBe(0);
      expect(report.items[0].routesBuilt).toBe(0);
    });
  });

  describe("getHourly", () => {
    it("returns exactly 24 zero-filled buckets and merges matching rows", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { hour: 18, count: 5 },
        { hour: 18, count: 3 },
      ]);

      const report = await service.getHourly({});

      expect(report.items).toHaveLength(24);
      expect(report.items[18].events).toBe(8);
      expect(report.items[0].events).toBe(0);
      expect(report.items[23].events).toBe(0);
    });

    it("skips hour buckets outside 0..23", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { hour: 99, count: 42 },
        { hour: 7, count: 1 },
      ]);

      const report = await service.getHourly({});

      expect(report.items[7].events).toBe(1);
      expect(report.items).toHaveLength(24);
    });
  });

  describe("getRoutesByStore", () => {
    it("groups, sorts by routesBuilt desc then storeId asc, and attaches the store projection", async () => {
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { storeId: "s2", _count: { _all: 3 } },
        { storeId: "s1", _count: { _all: 7 } },
        { storeId: null, _count: { _all: 99 } },
      ]);
      prisma.store.findMany.mockResolvedValue([
        { id: "s1", name: "Store One", slug: "one", floor: { number: 1 } },
        { id: "s2", name: "Store Two", slug: "two", floor: null },
      ]);

      const report = await service.getRoutesByStore({});

      expect(report.items).toHaveLength(2);
      expect(report.items[0].storeId).toBe("s1");
      expect(report.items[0].routesBuilt).toBe(7);
      expect(report.items[0].store).toEqual({
        id: "s1",
        name: "Store One",
        slug: "one",
        floorNumber: 1,
      });
      expect(report.items[1].storeId).toBe("s2");
      expect(report.items[1].store?.floorNumber).toBeNull();
    });
  });

  describe("getPopularCategories", () => {
    it("groups selections by category, sorts desc, and maps category metadata", async () => {
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { categoryId: "c2", _count: { _all: 4 } },
        { categoryId: "c1", _count: { _all: 9 } },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: "c1", name: "Coffee", slug: "coffee", isActive: true },
        { id: "c2", name: "Shoes", slug: "shoes", isActive: false },
      ]);

      const report = await service.getPopularCategories({});

      expect(report.items).toHaveLength(2);
      expect(report.items[0]).toEqual({
        categoryId: "c1",
        categoryName: "Coffee",
        categorySlug: "coffee",
        categoryIsActive: true,
        selections: 9,
      });
      expect(report.items[1].categoryId).toBe("c2");
      expect(report.items[1].categoryIsActive).toBe(false);
    });

    it("returns null projection fields when the category no longer exists", async () => {
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { categoryId: "gone", _count: { _all: 1 } },
      ]);
      prisma.category.findMany.mockResolvedValue([]);

      const report = await service.getPopularCategories({});

      expect(report.items[0]).toEqual({
        categoryId: "gone",
        categoryName: null,
        categorySlug: null,
        categoryIsActive: null,
        selections: 1,
      });
    });
  });

  describe("getSearchQueries", () => {
    it("computes the noResults flag from payload resultCount and filters by noResults", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { query: "coffee", count: "5", zeroCount: "5" },
        { query: "shoes", count: "8", zeroCount: "0" },
        { query: "hats", count: "3", zeroCount: "3" },
        { query: "bags", count: "4", zeroCount: "2" },
      ]);

      const report = await service.getSearchQueries({ noResults: true });

      expect(report.noResultsFilter).toBe(true);
      expect(report.items.map((i) => i.query)).toEqual(["coffee", "hats"]);
      expect(report.items.every((i) => i.noResults)).toBe(true);
    });

    it("returns all queries with noResults flag when filter is omitted", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { query: "coffee", count: "5", zeroCount: "5" },
        { query: "shoes", count: "8", zeroCount: "0" },
      ]);

      const report = await service.getSearchQueries({});

      expect(report.noResultsFilter).toBeNull();
      expect(report.items).toHaveLength(2);
      expect(report.items[0].noResults).toBe(true);
      expect(report.items[1].noResults).toBe(false);
    });

    it("treats zeroCount === count > 0 as noResults", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { query: "x", count: "2", zeroCount: "2" },
      ]);

      const report = await service.getSearchQueries({ noResults: true });
      expect(report.items[0].noResults).toBe(true);
    });

    it("does not flag noResults when a query has mixed result counts", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { query: "x", count: "5", zeroCount: "3" },
      ]);

      const report = await service.getSearchQueries({});
      expect(report.items[0].noResults).toBe(false);
    });

    it("returns numeric counts regardless of driver string formatting", async () => {
      prisma.$queryRaw.mockResolvedValue([
        { query: "x", count: 6, zeroCount: 1 },
      ]);

      const report = await service.getSearchQueries({});

      expect(report.items[0].count).toBe(6);
      expect(report.items[0].noResults).toBe(false);
    });
  });

  describe("getCardToRouteConversion", () => {
    it("returns a zero funnel when there are no card views", async () => {
      prisma.analyticsEvent.count.mockResolvedValue(0);

      const report = await service.getCardToRouteConversion({});

      expect(report.cardViews).toBe(0);
      expect(report.routesFromCardSessions).toBe(0);
      expect(report.conversionRate).toBe(0);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("computes conversion rate from card sessions that also built a route", async () => {
      prisma.analyticsEvent.count.mockResolvedValue(10);
      prisma.$queryRaw.mockResolvedValue([{ count: "4" }]);

      const report = await service.getCardToRouteConversion({});

      expect(report.cardViews).toBe(10);
      expect(report.routesFromCardSessions).toBe(4);
      expect(report.conversionRate).toBe(0.4);
    });

    it("falls back to 0 when the route query returns no rows", async () => {
      prisma.analyticsEvent.count.mockResolvedValue(8);
      prisma.$queryRaw.mockResolvedValue([]);

      const report = await service.getCardToRouteConversion({});

      expect(report.routesFromCardSessions).toBe(0);
      expect(report.conversionRate).toBe(0);
    });
  });
});
