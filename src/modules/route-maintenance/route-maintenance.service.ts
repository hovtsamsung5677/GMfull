import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

export type BlockState = {
  blocked: boolean;
  reason: string | null;
  blockedUntil: string | null;
  blockedAt: string | null;
};

export type BlockEdgeResult = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  metadata: Record<string, unknown> | null;
  block: BlockState;
};

export type BlockNodeResult = {
  id: string;
  type: string;
  code: string | null;
  metadata: Record<string, unknown> | null;
  block: BlockState;
};

type MetadataRecord = Record<string, unknown> & {
  blocked?: boolean;
  blockReason?: string;
  blockedUntil?: string;
  blockedAt?: string;
};

function extractBlock(metadata: unknown): BlockState {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { blocked: false, reason: null, blockedAt: null, blockedUntil: null };
  }

  const m = metadata as MetadataRecord;
  return {
    blocked: m.blocked === true,
    reason: typeof m.blockReason === "string" ? m.blockReason : null,
    blockedAt: typeof m.blockedAt === "string" ? m.blockedAt : null,
    blockedUntil: typeof m.blockedUntil === "string" ? m.blockedUntil : null,
  };
}

function mergeMetadata(
  existing: unknown,
  patch: Partial<MetadataRecord>,
): Prisma.InputJsonValue {
  const base: MetadataRecord =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as MetadataRecord) }
      : {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete base[key as keyof MetadataRecord];
    } else {
      (base as Record<string, unknown>)[key] = value;
    }
  }

  return base as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class RouteMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async blockEdge(
    edgeId: string,
    params: { reason?: string; blockedUntil?: string },
  ): Promise<BlockEdgeResult> {
    const edge = await this.prisma.routeEdge.findUnique({
      where: { id: edgeId },
    });

    if (!edge) {
      throw new NotFoundException(`Route edge "${edgeId}" not found`);
    }

    const now = new Date().toISOString();
    const updated = await this.prisma.routeEdge.update({
      where: { id: edgeId },
      data: {
        metadata: mergeMetadata(edge.metadata, {
          blocked: true,
          blockReason: params.reason ?? "maintenance",
          blockedUntil: params.blockedUntil,
          blockedAt: now,
        }),
      },
    });

    return this.toEdgeResult(updated);
  }

  async unblockEdge(edgeId: string): Promise<BlockEdgeResult> {
    const edge = await this.prisma.routeEdge.findUnique({
      where: { id: edgeId },
    });

    if (!edge) {
      throw new NotFoundException(`Route edge "${edgeId}" not found`);
    }

    const updated = await this.prisma.routeEdge.update({
      where: { id: edgeId },
      data: {
        metadata: mergeMetadata(edge.metadata, {
          blocked: false,
          blockReason: undefined,
          blockedUntil: undefined,
          blockedAt: undefined,
        }),
      },
    });

    return this.toEdgeResult(updated);
  }

  async blockNode(
    nodeId: string,
    params: { reason?: string; blockedUntil?: string },
  ): Promise<BlockNodeResult> {
    const node = await this.prisma.routeNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Route node "${nodeId}" not found`);
    }

    const now = new Date().toISOString();
    const updated = await this.prisma.routeNode.update({
      where: { id: nodeId },
      data: {
        metadata: mergeMetadata(node.metadata, {
          blocked: true,
          blockReason: params.reason ?? "maintenance",
          blockedUntil: params.blockedUntil,
          blockedAt: now,
        }),
      },
    });

    return this.toNodeResult(updated);
  }

  async unblockNode(nodeId: string): Promise<BlockNodeResult> {
    const node = await this.prisma.routeNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Route node "${nodeId}" not found`);
    }

    const updated = await this.prisma.routeNode.update({
      where: { id: nodeId },
      data: {
        metadata: mergeMetadata(node.metadata, {
          blocked: false,
          blockReason: undefined,
          blockedUntil: undefined,
          blockedAt: undefined,
        }),
      },
    });

    return this.toNodeResult(updated);
  }

  async listBlockedEdges(): Promise<BlockEdgeResult[]> {
    const edges = await this.prisma.routeEdge.findMany({
      where: {
        metadata: {
          path: ["blocked"],
          equals: true,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return edges.map((edge) => this.toEdgeResult(edge));
  }

  async listBlockedNodes(): Promise<BlockNodeResult[]> {
    const nodes = await this.prisma.routeNode.findMany({
      where: {
        metadata: {
          path: ["blocked"],
          equals: true,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return nodes.map((node) => this.toNodeResult(node));
  }

  private toEdgeResult(
    edge: Prisma.RouteEdgeGetPayload<Record<string, never>>,
  ): BlockEdgeResult {
    return {
      id: edge.id,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      metadata: (edge.metadata ?? null) as Record<string, unknown> | null,
      block: extractBlock(edge.metadata),
    };
  }

  private toNodeResult(
    node: Prisma.RouteNodeGetPayload<Record<string, never>>,
  ): BlockNodeResult {
    return {
      id: node.id,
      type: node.type,
      code: node.code ?? null,
      metadata: (node.metadata ?? null) as Record<string, unknown> | null,
      block: extractBlock(node.metadata),
    };
  }
}