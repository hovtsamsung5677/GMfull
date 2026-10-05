import { BadRequestException, Injectable } from "@nestjs/common";
import { AdPlacement, AnalyticsEventType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  AdAnalyticsBreakdownQueryDto,
  AdAnalyticsGroupBy,
  AdAnalyticsQueryDto,
} from "./dto/ad-analytics-query.dto";
import {
  AdAnalyticsBreakdownResponseDto,
  AdAnalyticsEntityResponseDto,
  AdAnalyticsSummaryResponseDto,
} from "./dto/ad-analytics-response.dto";

const AD_EVENT_TYPES = [
  AnalyticsEventType.AD_IMPRESSION,
  AnalyticsEventType.AD_CLICK,
] as const;

interface AdAnalyticsAggregateRow {
  entityId: string;
  type: AnalyticsEventType;
  count: number;
}

interface MutableAdAnalyticsMetrics {
  impressions: number;
  clicks: number;
}

@Injectable()
export class AdAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    query: AdAnalyticsQueryDto,
  ): Promise<AdAnalyticsSummaryResponseDto> {
    const rows = await this.prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: this.buildWhere(query),
      _count: { _all: true },
    });

    const metrics = this.toMetrics(
      rows.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
    );

    return {
      ...metrics,
      ctr: this.calculateCtr(metrics.impressions, metrics.clicks),
    };
  }

  async getBreakdown(
    query: AdAnalyticsBreakdownQueryDto,
  ): Promise<AdAnalyticsBreakdownResponseDto> {
    const rows = await this.aggregateByEntity(
      query.groupBy,
      this.buildWhere(query),
    );
    const metricsByEntity = this.groupMetrics(rows);
    const entitiesById = await this.loadEntities(query.groupBy, [
      ...metricsByEntity.keys(),
    ]);

    const items = [...metricsByEntity.entries()]
      .map(([entityId, metrics]) => ({
        entityId,
        entity: entitiesById.get(entityId) ?? null,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        ctr: this.calculateCtr(metrics.impressions, metrics.clicks),
      }))
      .sort(
        (left, right) =>
          right.impressions - left.impressions ||
          right.clicks - left.clicks ||
          left.entityId.localeCompare(right.entityId),
      );

    return { groupBy: query.groupBy, items };
  }

  private buildWhere(
    query: AdAnalyticsQueryDto,
  ): Prisma.AnalyticsEventWhereInput {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    if (from !== null && to !== null && from.getTime() >= to.getTime()) {
      throw new BadRequestException("from must be earlier than to");
    }

    return {
      type: { in: [...AD_EVENT_TYPES] },
      source: query.source,
      campaignId: query.campaignId,
      creativeId: query.creativeId,
      adSlotId: query.adSlotId,
      panelId: query.panelId,
      ...(from !== null || to !== null
        ? {
            createdAt: {
              ...(from !== null ? { gte: from } : {}),
              ...(to !== null ? { lt: to } : {}),
            },
          }
        : {}),
    };
  }

  private async aggregateByEntity(
    groupBy: AdAnalyticsGroupBy,
    where: Prisma.AnalyticsEventWhereInput,
  ): Promise<AdAnalyticsAggregateRow[]> {
    switch (groupBy) {
      case AdAnalyticsGroupBy.CAMPAIGN: {
        const rows = await this.prisma.analyticsEvent.groupBy({
          by: ["campaignId", "type"],
          where: { AND: [where, { campaignId: { not: null } }] },
          _count: { _all: true },
        });
        return rows.map((row) => ({
          entityId: row.campaignId!,
          type: row.type,
          count: row._count._all,
        }));
      }
      case AdAnalyticsGroupBy.CREATIVE: {
        const rows = await this.prisma.analyticsEvent.groupBy({
          by: ["creativeId", "type"],
          where: { AND: [where, { creativeId: { not: null } }] },
          _count: { _all: true },
        });
        return rows.map((row) => ({
          entityId: row.creativeId!,
          type: row.type,
          count: row._count._all,
        }));
      }
      case AdAnalyticsGroupBy.SLOT: {
        const rows = await this.prisma.analyticsEvent.groupBy({
          by: ["adSlotId", "type"],
          where: { AND: [where, { adSlotId: { not: null } }] },
          _count: { _all: true },
        });
        return rows.map((row) => ({
          entityId: row.adSlotId!,
          type: row.type,
          count: row._count._all,
        }));
      }
      case AdAnalyticsGroupBy.PANEL: {
        const rows = await this.prisma.analyticsEvent.groupBy({
          by: ["panelId", "type"],
          where: { AND: [where, { panelId: { not: null } }] },
          _count: { _all: true },
        });
        return rows.map((row) => ({
          entityId: row.panelId!,
          type: row.type,
          count: row._count._all,
        }));
      }
    }
  }

  private groupMetrics(
    rows: AdAnalyticsAggregateRow[],
  ): Map<string, MutableAdAnalyticsMetrics> {
    const metricsByEntity = new Map<string, MutableAdAnalyticsMetrics>();

    for (const row of rows) {
      const metrics = metricsByEntity.get(row.entityId) ?? {
        impressions: 0,
        clicks: 0,
      };

      if (row.type === AnalyticsEventType.AD_IMPRESSION) {
        metrics.impressions += row.count;
      } else if (row.type === AnalyticsEventType.AD_CLICK) {
        metrics.clicks += row.count;
      }

      metricsByEntity.set(row.entityId, metrics);
    }

    return metricsByEntity;
  }

  private toMetrics(
    rows: Array<{ type: AnalyticsEventType; count: number }>,
  ): MutableAdAnalyticsMetrics {
    return rows.reduce<MutableAdAnalyticsMetrics>(
      (metrics, row) => {
        if (row.type === AnalyticsEventType.AD_IMPRESSION) {
          metrics.impressions += row.count;
        } else if (row.type === AnalyticsEventType.AD_CLICK) {
          metrics.clicks += row.count;
        }
        return metrics;
      },
      { impressions: 0, clicks: 0 },
    );
  }

  private calculateCtr(impressions: number, clicks: number): number {
    return impressions === 0 ? 0 : clicks / impressions;
  }

  private async loadEntities(
    groupBy: AdAnalyticsGroupBy,
    ids: string[],
  ): Promise<Map<string, AdAnalyticsEntityResponseDto>> {
    if (ids.length === 0) {
      return new Map();
    }

    switch (groupBy) {
      case AdAnalyticsGroupBy.CAMPAIGN: {
        const campaigns = await this.prisma.adCampaign.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, placement: true },
        });
        return this.toEntityMap(
          campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            code: null,
            placement: campaign.placement,
            campaignId: null,
          })),
        );
      }
      case AdAnalyticsGroupBy.CREATIVE: {
        const creatives = await this.prisma.adCreative.findMany({
          where: { id: { in: ids } },
          select: { id: true, title: true, campaignId: true },
        });
        return this.toEntityMap(
          creatives.map((creative) => ({
            id: creative.id,
            name: creative.title,
            code: null,
            placement: null,
            campaignId: creative.campaignId,
          })),
        );
      }
      case AdAnalyticsGroupBy.SLOT: {
        const slots = await this.prisma.adSlot.findMany({
          where: { id: { in: ids } },
          select: { id: true, code: true, name: true, placement: true },
        });
        return this.toEntityMap(
          slots.map((slot) => ({
            id: slot.id,
            name: slot.name,
            code: slot.code,
            placement: slot.placement,
            campaignId: null,
          })),
        );
      }
      case AdAnalyticsGroupBy.PANEL: {
        const panels = await this.prisma.panel.findMany({
          where: { id: { in: ids } },
          select: { id: true, code: true, name: true },
        });
        return this.toEntityMap(
          panels.map((panel) => ({
            id: panel.id,
            name: panel.name,
            code: panel.code,
            placement: null,
            campaignId: null,
          })),
        );
      }
    }
  }

  private toEntityMap(
    entities: Array<{
      id: string;
      name: string | null;
      code: string | null;
      placement: AdPlacement | null;
      campaignId: string | null;
    }>,
  ): Map<string, AdAnalyticsEntityResponseDto> {
    return new Map(entities.map((entity) => [entity.id, entity]));
  }
}
