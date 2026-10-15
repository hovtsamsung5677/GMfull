import { Injectable } from "@nestjs/common";
import { AnalyticsEventType, AnalyticsSource, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

type RouteBuiltPayload = {
  fromNodeId?: string;
  toNodeId?: string;
  floorId?: string | null;
  totalDistance?: number;
  totalWeight?: number;
  edgeIds?: string[];
  mode?: "normal" | "emergency";
};

type RollupRow = {
  edgeId: string;
  count: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRouteBuilt(params: {
    sessionId?: string;
    panelId?: string;
    payload: RouteBuiltPayload;
    source?: AnalyticsSource;
  }): Promise<void> {
    const { payload, ...rest } = params;

    await this.prisma.analyticsEvent.create({
      data: {
        type: AnalyticsEventType.ROUTE_BUILT,
        source: rest.source ?? AnalyticsSource.MOBILE,
        sessionId: rest.sessionId,
        panelId: rest.panelId,
        payload: {
          ...payload,
          recordedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  async recordEdgeUsage(edgeId: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - ROUTE_USAGE_WINDOW_MS,
    );

    await this.prisma.routeEdgeUsage.upsert({
      where: { edgeId },
      update: {
        count: { increment: 1 },
        lastUsedAt: now,
        windowStart,
      },
      create: {
        edgeId,
        count: 1,
        windowStart,
        lastUsedAt: now,
      },
    });
  }

  async recordPathUsage(edgeIds: string[]): Promise<void> {
    if (edgeIds.length === 0) {
      return;
    }

    // Only count persisted edges (skip virtual vertical edges).
    const realEdgeIds = edgeIds.filter(
      (id) => !id.startsWith("vertical:"),
    );

    if (realEdgeIds.length === 0) {
      return;
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - ROUTE_USAGE_WINDOW_MS);

    await this.prisma.$transaction(
      realEdgeIds.map((edgeId) =>
        this.prisma.routeEdgeUsage.upsert({
          where: { edgeId },
          update: {
            count: { increment: 1 },
            lastUsedAt: now,
            windowStart,
          },
          create: {
            edgeId,
            count: 1,
            windowStart,
            lastUsedAt: now,
          },
        }),
      ),
    );
  }

  async getEdgeUsage(floorId?: string): Promise<RollupRow[]> {
    const cutoff = new Date(Date.now() - ROUTE_USAGE_WINDOW_MS);

    const rows = await this.prisma.routeEdgeUsage.findMany({
      where: {
        lastUsedAt: { gte: cutoff },
        edge: {
          isActive: true,
          ...(floorId ? { floorId } : {}),
        },
      },
      select: {
        edgeId: true,
        count: true,
      },
      orderBy: {
        count: "desc",
      },
    });

    return rows.map((row) => ({
      edgeId: row.edgeId,
      count: row.count,
    }));
  }

  async getEdgeUsageMap(
    floorId?: string,
  ): Promise<Map<string, number>> {
    const rows = await this.getEdgeUsage(floorId);
    return new Map(rows.map((row) => [row.edgeId, row.count]));
  }
}

export const ROUTE_USAGE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes rolling window