import { AnalyticsEventType } from "@prisma/client";
import { AdAnalyticsService } from "./ad-analytics.service";
import { AdAnalyticsGroupBy } from "./dto/ad-analytics-query.dto";

describe("AdAnalyticsService", () => {
  const prisma: {
    analyticsEvent: { groupBy: jest.Mock; count: jest.Mock };
    adCampaign: { findMany: jest.Mock };
    adCreative: { findMany: jest.Mock };
    adSlot: { findMany: jest.Mock };
    panel: { findMany: jest.Mock };
    [key: string]: unknown;
  } = {
    analyticsEvent: { groupBy: jest.fn(), count: jest.fn() },
    adCampaign: { findMany: jest.fn() },
    adCreative: { findMany: jest.fn() },
    adSlot: { findMany: jest.fn() },
    panel: { findMany: jest.fn() },
  };

  const service = new AdAnalyticsService(prisma as unknown as any);

  beforeEach(() => jest.clearAllMocks());

  describe("getSummary", () => {
    it("sums impressions and clicks and computes uncapped CTR", async () => {
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { type: AnalyticsEventType.AD_IMPRESSION, _count: { _all: 1000 } },
        { type: AnalyticsEventType.AD_CLICK, _count: { _all: 50 } },
      ]);

      const summary = await service.getSummary({});

      expect(summary.impressions).toBe(1000);
      expect(summary.clicks).toBe(50);
      expect(summary.ctr).toBe(0.05);
    });

    it("returns 0 CTR when there are no impressions", async () => {
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { type: AnalyticsEventType.AD_CLICK, _count: { _all: 7 } },
      ]);

      const summary = await service.getSummary({});

      expect(summary.impressions).toBe(0);
      expect(summary.clicks).toBe(7);
      expect(summary.ctr).toBe(0);
    });
  });

  describe("getImpressionClickConversion", () => {
    it("computes impression-to-click conversion and ISO range strings", async () => {
      prisma.analyticsEvent.count
        .mockResolvedValueOnce(200) // impressions
        .mockResolvedValueOnce(30); // clicks

      const report = await service.getImpressionClickConversion({
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      });

      expect(report.from).toBe("2026-08-01T00:00:00.000Z");
      expect(report.to).toBe("2026-09-01T00:00:00.000Z");
      expect(report.impressions).toBe(200);
      expect(report.clicks).toBe(30);
      expect(report.conversionRate).toBe(0.15);
    });

    it("returns null range and 0 conversion when no period is supplied", async () => {
      prisma.analyticsEvent.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const report = await service.getImpressionClickConversion({});

      expect(report.from).toBeNull();
      expect(report.to).toBeNull();
      expect(report.conversionRate).toBe(0);
    });
  });

  describe("getBreakdown", () => {
    const groupByIdField: Record<AdAnalyticsGroupBy, string> = {
      [AdAnalyticsGroupBy.CAMPAIGN]: "campaignId",
      [AdAnalyticsGroupBy.CREATIVE]: "creativeId",
      [AdAnalyticsGroupBy.SLOT]: "adSlotId",
      [AdAnalyticsGroupBy.PANEL]: "panelId",
    };
    const entityStoreField: Record<AdAnalyticsGroupBy, string> = {
      [AdAnalyticsGroupBy.CAMPAIGN]: "adCampaign",
      [AdAnalyticsGroupBy.CREATIVE]: "adCreative",
      [AdAnalyticsGroupBy.SLOT]: "adSlot",
      [AdAnalyticsGroupBy.PANEL]: "panel",
    };

    it.each(
      Object.values(AdAnalyticsGroupBy).map((groupBy) => [
        groupBy,
        entityStoreField[groupBy],
        groupByIdField[groupBy],
      ]),
    )(
      "aggregates and sorts by %s dimension",
      async (groupBy, store, idField) => {
        const rows = [
          {
            [idField]: "e2",
            type: AnalyticsEventType.AD_IMPRESSION,
            _count: { _all: 5 },
          },
          {
            [idField]: "e2",
            type: AnalyticsEventType.AD_CLICK,
            _count: { _all: 1 },
          },
          {
            [idField]: "e1",
            type: AnalyticsEventType.AD_IMPRESSION,
            _count: { _all: 10 },
          },
          {
            [idField]: "e1",
            type: AnalyticsEventType.AD_CLICK,
            _count: { _all: 4 },
          },
        ];
        prisma.analyticsEvent.groupBy.mockResolvedValue(rows);
        (prisma[store] as { findMany: jest.Mock }).findMany.mockResolvedValue([
          {
            id: "e1",
            name: "Entity One",
            title: "Entity One",
            code: "c1",
            placement: null,
            campaignId: null,
          },
          {
            id: "e2",
            name: "Entity Two",
            title: "Entity Two",
            code: "c2",
            placement: null,
            campaignId: null,
          },
        ]);

        const report = await service.getBreakdown({ groupBy });

        expect(report.items).toHaveLength(2);
        expect(report.items[0].entityId).toBe("e1");
        expect(report.items[0].impressions).toBe(10);
        expect(report.items[0].clicks).toBe(4);
        expect(report.items[0].ctr).toBeCloseTo(0.4);
        expect(report.items[0].entity?.name).toBe("Entity One");
      },
    );

    it("omits null identifiers from the grouped set", async () => {
      const idField = groupByIdField[AdAnalyticsGroupBy.CAMPAIGN];
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        {
          [idField]: "e1",
          type: AnalyticsEventType.AD_IMPRESSION,
          _count: { _all: 3 },
        },
      ]);

      const report = await service.getBreakdown({
        groupBy: AdAnalyticsGroupBy.CAMPAIGN,
      });

      expect(report.items[0].entityId).toBe("e1");
    });
  });
});
