import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RouteNodeType } from "@prisma/client";
import { isPrimaryStoreRelation } from "../../common/utils/store-primary.util";
import { PrismaService } from "../../database/prisma.service";
import { RouteEdgeResponseDto } from "../route-edges/dto/route-edge-response.dto";
import { RouteNodeResponseDto } from "../route-nodes/dto/route-node-response.dto";
import { BuildRouteToStoreQueryDto } from "./dto/build-route-to-store-query.dto";
import {
  BuildRouteToStoreResponseDto,
  RouteToStoreTargetStoreDto,
} from "./dto/build-route-to-store-response.dto";
import { BuildRouteQueryDto } from "./dto/build-route-query.dto";
import {
  BuildRouteResponseDto,
  RouteInstructionDto,
  RouteMetaDto,
  RoutePathPointDto,
  RouteSegmentDto,
} from "./dto/build-route-response.dto";

const routeNodeInclude = {
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
} satisfies Prisma.RouteNodeInclude;

const routeEdgeInclude = {
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
  fromNode: {
    include: routeNodeInclude,
  },
  toNode: {
    include: routeNodeInclude,
  },
} satisfies Prisma.RouteEdgeInclude;

type RouteNodeWithFloor = Prisma.RouteNodeGetPayload<{
  include: typeof routeNodeInclude;
}>;

type RouteEdgeWithRelations = Prisma.RouteEdgeGetPayload<{
  include: typeof routeEdgeInclude;
}>;

const routeTargetStoreInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  mapObjects: {
    where: {
      isActive: true,
    },
    select: {
      id: true,
      metadata: true,
      routeNodes: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          metadata: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  },
} satisfies Prisma.StoreInclude;

type RouteTargetStore = Prisma.StoreGetPayload<{
  include: typeof routeTargetStoreInclude;
}>;

type GraphConnection = {
  toNodeId: string;
  edgeId: string;
  cost: number;
  distance: number;
};

type PreviousStep = {
  nodeId: string;
  edgeId: string;
  cost: number;
  distance: number;
};

type ShortestPath = {
  nodeIds: string[];
  edgeIds: string[];
  totalDistance: number;
  totalWeight: number;
};

const routeRenderingMeta = {
  supports2D: true,
  supports3D: true,
  coordinateSystem: "mall-local",
  usesXYZ: true,
};

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: BuildRouteQueryDto): Promise<BuildRouteResponseDto> {
    const [fromNode, toNode] = await this.prisma.$transaction([
      this.prisma.routeNode.findUnique({
        where: { id: query.fromNodeId },
        include: routeNodeInclude,
      }),
      this.prisma.routeNode.findUnique({
        where: { id: query.toNodeId },
        include: routeNodeInclude,
      }),
    ]);

    if (!fromNode || !fromNode.isActive) {
      throw new NotFoundException("From route node not found");
    }

    if (!toNode || !toNode.isActive) {
      throw new NotFoundException("To route node not found");
    }

    if (query.floorId) {
      const floor = await this.prisma.floor.findFirst({
        where: { id: query.floorId, isActive: true },
        select: { id: true },
      });

      if (!floor) {
        throw new NotFoundException("Floor not found");
      }

      if (fromNode.floorId !== query.floorId) {
        throw new NotFoundException(
          "From route node not found on selected floor",
        );
      }

      if (toNode.floorId !== query.floorId) {
        throw new NotFoundException(
          "To route node not found on selected floor",
        );
      }
    }

    const graphWhere: Prisma.RouteNodeWhereInput = {
      isActive: true,
      ...(query.floorId ? { floorId: query.floorId } : {}),
    };

    const edgeWhere: Prisma.RouteEdgeWhereInput = query.floorId
      ? {
          isActive: true,
          floorId: query.floorId,
          fromNode: { isActive: true, floorId: query.floorId },
          toNode: { isActive: true, floorId: query.floorId },
        }
      : {
          isActive: true,
          fromNode: { isActive: true },
          toNode: { isActive: true },
        };

    const [nodes, edges] = await this.prisma.$transaction([
      this.prisma.routeNode.findMany({
        where: graphWhere,
        include: routeNodeInclude,
      }),
      this.prisma.routeEdge.findMany({
        where: edgeWhere,
        include: routeEdgeInclude,
      }),
    ]);

    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    console.log('[routes] build graph loaded', {
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      floorId: query.floorId ?? 'all',
      nodesCount: nodes.length,
      edgesCount: edges.length,
      fromNodeInGraph: nodeById.has(fromNode.id),
      toNodeInGraph: nodeById.has(toNode.id),
    });

    if (!nodeById.has(fromNode.id) || !nodeById.has(toNode.id)) {
      throw new NotFoundException("Route not found for selected floor");
    }

    const verticalEdges = this.buildVerticalEdges(nodes);
    const allEdges = edges.concat(verticalEdges);

    // Вертикальные рёбра синтезируются в памяти и отсутствуют в БД,
    // поэтому путь восстанавливаем по allEdges, а не по edgeById.
    const allEdgeById = new Map(allEdges.map((edge) => [edge.id, edge]));

    console.log('[routes] build vertical edges', {
      count: verticalEdges.length,
      items: verticalEdges.map((e) => ({ id: e.id, from: e.fromNodeId, to: e.toNodeId, distance: e.distance })),
    });

    const path = this.findShortestPath({
      nodes,
      edges: allEdges,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
    });

    console.log('[routes] build shortestPath result', {
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      pathFound: Boolean(path),
      pathNodeIds: path?.nodeIds,
      pathEdgeIds: path?.edgeIds,
      totalDistance: path?.totalDistance,
    });

    if (!path) {
      console.log('[routes] build graph debug', {
        nodes: nodes.map((n) => ({ id: n.id, floorId: n.floorId, type: n.type, code: n.code })),
        edges: edges.map((e) => ({ id: e.id, from: e.fromNodeId, to: e.toNodeId, floorId: e.floorId })),
        verticalEdges: verticalEdges.map((e) => ({ id: e.id, from: e.fromNodeId, to: e.toNodeId, floorId: e.floorId })),
      });
      throw new NotFoundException(
        `Route not found between ${fromNode.id} (floor ${fromNode.floorId}) and ${toNode.id} (floor ${toNode.floorId}). ` +
          `Graph: ${nodes.length} nodes, ${edges.length} edges, ${verticalEdges.length} vertical edges. ` +
          `From node in graph: ${nodeById.has(fromNode.id)}, To node in graph: ${nodeById.has(toNode.id)}`,
      );
    }

    const routeNodes = path.nodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((n): n is RouteNodeWithFloor => Boolean(n));
    const routeEdges = path.edgeIds
      .map((edgeId) => allEdgeById.get(edgeId))
      .filter((e): e is RouteEdgeWithRelations => Boolean(e));
    const segments = this.splitIntoFloorSegments(routeNodes);
    const floorChanges = this.buildFloorChanges(routeNodes);

    return {
      fromNode: this.toRouteNodeResponse(fromNode),
      toNode: this.toRouteNodeResponse(toNode),
      nodes: routeNodes.map((node) => this.toRouteNodeResponse(node)),
      edges: routeEdges.map((edge) => this.toRouteEdgeResponse(edge)),
      totalDistance: path.totalDistance,
      totalWeight: path.totalWeight,
      routePath: this.toRoutePath(routeNodes),
      routeSegments: this.toRouteSegments(routeNodes, routeEdges),
      segments,
      floorChanges,
      instructions: this.toRouteInstructions(routeNodes),
      meta: this.createRouteMeta({
        schemaVersion: "green-mall-route-v2",
        purpose: "Frontend-ready route between navigation nodes",
      }),
    };
  }

  async buildToStore(
    query: BuildRouteToStoreQueryDto,
  ): Promise<BuildRouteToStoreResponseDto> {
    const trimmedSlug = (query.storeSlug ?? '').trim();
    console.log('[routes] buildToStore start', {
      fromNodeId: query.fromNodeId,
      storeSlug: trimmedSlug,
      storeId: query.storeId,
      storeCode: query.storeCode,
      floorId: query.floorId,
    });

    const storeWhere = this.buildStoreIdentifierWhere(query);
    const store = await this.prisma.store.findFirst({
      where: storeWhere,
      include: routeTargetStoreInclude,
    });

    console.log('[routes] buildToStore store lookup', {
      found: Boolean(store),
      storeId: store?.id,
      floorId: store?.floorId,
      mapObjectsCount: store?.mapObjects?.length ?? 0,
    });

    if (!store) {
      throw new NotFoundException(
        `Store not found for query: ${JSON.stringify({ storeId: query.storeId, storeSlug: trimmedSlug, storeCode: query.storeCode })}`,
      );
    }

    const targetNode = await this.findStoreRouteNode(store.id, store.floorId ?? undefined);

    console.log('[routes] buildToStore targetNode', {
      storeId: store.id,
      floorId: store.floorId,
      targetNodeId: targetNode?.id,
      targetNodeFloorId: targetNode?.floorId,
    });

    if (!targetNode) {
      const storeMapObjects = await this.prisma.mapObject.findMany({
        where: { storeId: store.id, isActive: true },
        select: { id: true, floorId: true },
      });
      throw new NotFoundException(
        `Store route node not found for store ${store.id} on floor ${store.floorId ?? 'any'}. Store mapObjects: ${JSON.stringify(storeMapObjects)}`,
      );
    }

    const route = await this.build({
      fromNodeId: query.fromNodeId,
      toNodeId: targetNode.id,
    });

    console.log('[routes] buildToStore success', {
      fromNodeId: query.fromNodeId,
      toNodeId: targetNode.id,
      totalDistance: route.totalDistance,
    });

    const response = {
      fromNode: route.fromNode,
      targetStore: this.toTargetStoreResponse(store, targetNode.id),
      toNode: route.toNode,
      nodes: route.nodes,
      edges: route.edges,
      totalDistance: route.totalDistance,
      totalWeight: route.totalWeight,
      routePath: route.routePath,
      routeSegments: route.routeSegments,
      segments: route.segments,
      floorChanges: route.floorChanges,
      instructions: route.instructions,
      meta: {
        schemaVersion: "green-mall-route-to-store-v3",
        generatedAt: new Date().toISOString(),
        purpose: "Frontend-ready route from navigation node to selected store",
        rendering: routeRenderingMeta,
      },
    };

    return response;
  }

  private buildStoreIdentifierWhere(
    query: BuildRouteToStoreQueryDto,
  ): Prisma.StoreWhereInput {
    if (!query.storeId && !query.storeSlug && !query.storeCode) {
      throw new BadRequestException(
        "Provide one of storeId, storeSlug or storeCode",
      );
    }

    const where: Prisma.StoreWhereInput = {
      isActive: true,
      isVisible: true,
      tenant: {
        is: {
          isActive: true,
        },
      },
    };

    if (query.storeId) {
      where.id = query.storeId;
      return where;
    }

    if (query.storeSlug) {
      where.slug = query.storeSlug;
      return where;
    }

    where.OR = [
      { slug: query.storeCode },
      {
        mapObjects: {
          some: {
            routeNodes: {
              some: {
                code: query.storeCode,
                isActive: true,
              },
            },
          },
        },
      },
    ];

    return where;
  }

  private async findStoreRouteNode(storeId: string, floorId?: string) {
    const exact = await this.prisma.routeNode.findMany({
      where: {
        isActive: true,
        type: RouteNodeType.STORE_ANCHOR,
        ...(floorId ? { floorId } : {}),
        mapObject: {
          isActive: true,
          storeId,
        },
      },
      include: routeNodeInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const exactPrimary =
      exact.find((node) =>
        isPrimaryStoreRelation(node.metadata, "routeNode", storeId),
      ) ??
      exact[0];

    if (exactPrimary) {
      return exactPrimary;
    }

    const fallbackFloorId = floorId ?? (await this.getStoreFloorId(storeId));
    if (!fallbackFloorId) {
      return null;
    }

    const floorFallback = await this.prisma.routeNode.findFirst({
      where: {
        isActive: true,
        type: RouteNodeType.STORE_ANCHOR,
        floorId: fallbackFloorId,
      },
      include: routeNodeInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return floorFallback ?? null;
  }

  private async getStoreFloorId(storeId: string): Promise<string | undefined> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { floorId: true },
    });
    return store?.floorId ?? undefined;
  }

  private buildVerticalEdges(nodes: RouteNodeWithFloor[]): RouteEdgeWithRelations[] {
    const VERTICAL_TYPES = new Set(['ELEVATOR', 'ESCALATOR', 'STAIRS']);
    const vertical: RouteEdgeWithRelations[] = [];
    const seenPairs = new Set<string>();

    const addPair = (a: RouteNodeWithFloor, b: RouteNodeWithFloor) => {
      if (a.floorId === b.floorId) return;
      const key = [a.id, b.id].sort().join('|');
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      vertical.push(this.makeVerticalEdge(a, b));
      vertical.push(this.makeVerticalEdge(b, a));
    };

    const byCode = new Map<string, RouteNodeWithFloor[]>();
    for (const node of nodes) {
      if (!node.code) continue;
      const list = byCode.get(node.code) ?? [];
      list.push(node);
      byCode.set(node.code, list);
    }
    for (const group of byCode.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addPair(group[i], group[j]);
        }
      }
    }

    const verticalNodes = nodes.filter((n) => VERTICAL_TYPES.has(n.type));
    const byType = new Map<string, RouteNodeWithFloor[]>();
    for (const node of verticalNodes) {
      const list = byType.get(node.type) ?? [];
      list.push(node);
      byType.set(node.type, list);
    }
    for (const group of byType.values()) {
      const byFloor = new Map<string, RouteNodeWithFloor[]>();
      for (const node of group) {
        const list = byFloor.get(node.floorId) ?? [];
        list.push(node);
        byFloor.set(node.floorId, list);
      }
      const floors = [...byFloor.values()];
      for (let i = 0; i < floors.length; i++) {
        for (let j = i + 1; j < floors.length; j++) {
          for (const a of floors[i]) {
            for (const b of floors[j]) {
              addPair(a, b);
            }
          }
        }
      }
    }
    return vertical;
  }

  private makeVerticalEdge(
    from: RouteNodeWithFloor,
    to: RouteNodeWithFloor,
  ): RouteEdgeWithRelations {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = (to.z ?? 0) - (from.z ?? 0);
    const distance = Math.max(1, Math.round(Math.hypot(dx, dy, dz)));

    return {
      id: `vertical:${from.id}->${to.id}`,
      type: from.type,
      fromNodeId: from.id,
      toNodeId: to.id,
      // Вертикальное ребро соединяет разные этажи, поэтому общего floorId у него нет.
      floorId: null,
      label: null,
      isBidirectional: true,
      distance,
      weight: distance,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      floor: null,
      fromNode: from,
      toNode: to,
    } as unknown as RouteEdgeWithRelations;
  }

  private splitIntoFloorSegments(
    nodes: RouteNodeWithFloor[],
  ): { floorNumber: number; floorId: string; points: RoutePathPointDto[] }[] {
    const segments: { floorNumber: number; floorId: string; points: RoutePathPointDto[] }[] = [];
    for (const node of nodes) {
      const floorNumber = node.floor?.number ?? 0;
      const floorId = node.floorId;
      const last = segments[segments.length - 1];
      const point = this.toRoutePath([node])[0];
      if (last && last.floorNumber === floorNumber && last.floorId === floorId) {
        last.points.push(point);
      } else {
        segments.push({ floorNumber, floorId, points: [point] });
      }
    }
    return segments;
  }

  private buildFloorChanges(
    nodes: RouteNodeWithFloor[],
  ): { fromFloor: number; toFloor: number; fromFloorId: string | null; toFloorId: string | null; nodeCode: string; type: string }[] {
    const changes: { fromFloor: number; toFloor: number; fromFloorId: string | null; toFloorId: string | null; nodeCode: string; type: string }[] = [];
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const cur = nodes[i];
      if (prev.floorId !== cur.floorId) {
        changes.push({
          fromFloor: prev.floor?.number ?? 0,
          toFloor: cur.floor?.number ?? 0,
          fromFloorId: prev.floorId,
          toFloorId: cur.floorId,
          nodeCode: prev.code ?? cur.code ?? "",
          type: prev.type ?? cur.type ?? "ELEVATOR",
        });
      }
    }
    return changes;
  }
  private findShortestPath(params: {
    nodes: RouteNodeWithFloor[];
    edges: RouteEdgeWithRelations[];
    fromNodeId: string;
    toNodeId: string;
  }): ShortestPath | null {
    if (params.fromNodeId === params.toNodeId) {
      return {
        nodeIds: [params.fromNodeId],
        edgeIds: [],
        totalDistance: 0,
        totalWeight: 0,
      };
    }

    const activeNodeIds = new Set(params.nodes.map((node) => node.id));
    const adjacency = new Map<string, GraphConnection[]>();

    for (const nodeId of activeNodeIds) {
      adjacency.set(nodeId, []);
    }

    for (const edge of params.edges) {
      if (
        !activeNodeIds.has(edge.fromNodeId) ||
        !activeNodeIds.has(edge.toNodeId)
      ) {
        continue;
      }

      const distance = edge.distance ?? 1;
      const cost = distance;

      adjacency.get(edge.fromNodeId)?.push({
        toNodeId: edge.toNodeId,
        edgeId: edge.id,
        cost,
        distance,
      });

      if (edge.isBidirectional) {
        adjacency.get(edge.toNodeId)?.push({
          toNodeId: edge.fromNodeId,
          edgeId: edge.id,
          cost,
          distance,
        });
      }
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, PreviousStep>();
    const visited = new Set<string>();

    for (const nodeId of activeNodeIds) {
      distances.set(nodeId, Number.POSITIVE_INFINITY);
    }

    distances.set(params.fromNodeId, 0);

    while (visited.size < activeNodeIds.size) {
      const currentNodeId = this.getClosestUnvisitedNode(distances, visited);

      if (!currentNodeId) {
        break;
      }

      if (currentNodeId === params.toNodeId) {
        break;
      }

      visited.add(currentNodeId);

      for (const connection of adjacency.get(currentNodeId) ?? []) {
        if (visited.has(connection.toNodeId)) {
          continue;
        }

        const nextDistance =
          (distances.get(currentNodeId) ?? Number.POSITIVE_INFINITY) +
          connection.cost;

        if (
          nextDistance <
          (distances.get(connection.toNodeId) ?? Number.POSITIVE_INFINITY)
        ) {
          distances.set(connection.toNodeId, nextDistance);
          previous.set(connection.toNodeId, {
            nodeId: currentNodeId,
            edgeId: connection.edgeId,
            cost: connection.cost,
            distance: connection.distance,
          });
        }
      }
    }

    if (
      (distances.get(params.toNodeId) ?? Number.POSITIVE_INFINITY) ===
      Number.POSITIVE_INFINITY
    ) {
      return null;
    }

    return this.restorePath(params.fromNodeId, params.toNodeId, previous);
  }

  private getClosestUnvisitedNode(
    distances: Map<string, number>,
    visited: Set<string>,
  ): string | null {
    let closestNodeId: string | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const [nodeId, distance] of distances) {
      if (!visited.has(nodeId) && distance < closestDistance) {
        closestNodeId = nodeId;
        closestDistance = distance;
      }
    }

    return closestNodeId;
  }

  private restorePath(
    fromNodeId: string,
    toNodeId: string,
    previous: Map<string, PreviousStep>,
  ): ShortestPath | null {
    const nodeIds = [toNodeId];
    const edgeIds: string[] = [];
    let totalDistance = 0;
    let totalWeight = 0;
    let currentNodeId = toNodeId;

    while (currentNodeId !== fromNodeId) {
      const step = previous.get(currentNodeId);

      if (!step) {
        return null;
      }

      edgeIds.unshift(step.edgeId);
      nodeIds.unshift(step.nodeId);
      totalDistance += step.distance;
      totalWeight += step.cost;
      currentNodeId = step.nodeId;
    }

    return {
      nodeIds,
      edgeIds,
      totalDistance,
      totalWeight,
    };
  }

  private toRouteNodeResponse(node: RouteNodeWithFloor): RouteNodeResponseDto {
    return {
      id: node.id,
      floorId: node.floorId,
      type: node.type,
      name: node.name,
      code: node.code,
      x: node.x,
      y: node.y,
      z: node.z,
      rotationX: node.rotationX,
      rotationY: node.rotationY,
      rotationZ: node.rotationZ,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
      scaleZ: node.scaleZ,
      mapObjectId: node.mapObjectId,
      metadata: node.metadata,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      floor: node.floor,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private toRouteEdgeResponse(
    edge: RouteEdgeWithRelations,
  ): RouteEdgeResponseDto {
    return {
      id: edge.id,
      type: edge.type,
      floorId: edge.floorId,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      distance: edge.distance,
      weight: edge.weight,
      isBidirectional: edge.isBidirectional,
      metadata: edge.metadata,
      isActive: edge.isActive,
      floor: edge.floor,
      fromNode: this.toRouteNodeResponse(edge.fromNode),
      toNode: this.toRouteNodeResponse(edge.toNode),
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }

  private toRoutePath(nodes: RouteNodeWithFloor[]): RoutePathPointDto[] {
    return nodes.map((node) => ({
      nodeId: node.id,
      type: node.type,
      name: this.getNodeLabel(node),
      code: node.code,
      x: node.x,
      y: node.y,
      z: node.z ?? 0,
      floorId: node.floorId,
      floorNumber: node.floor.number,
      mapObjectId: node.mapObjectId,
      sortOrder: node.sortOrder,
    }));
  }

  private toRouteSegments(
    nodes: RouteNodeWithFloor[],
    edges: RouteEdgeWithRelations[],
  ): RouteSegmentDto[] {
    const segments: RouteSegmentDto[] = [];

    for (let index = 0; index < edges.length; index += 1) {
      const edge = edges[index];
      const fromNode = nodes[index];
      const toNode = nodes[index + 1];

      if (!fromNode || !toNode) {
        continue;
      }

      segments.push({
        edgeId: edge.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        from: {
          x: fromNode.x,
          y: fromNode.y,
          z: fromNode.z ?? 0,
        },
        to: {
          x: toNode.x,
          y: toNode.y,
          z: toNode.z ?? 0,
        },
        distance: edge.distance ?? edge.weight ?? 1,
        weight: edge.weight ?? edge.distance ?? 1,
        isBidirectional: edge.isBidirectional,
        floorId: edge.floorId,
        label: this.getRouteEdgeLabel(edge),
      });
    }

    return segments;
  }

  private toRouteInstructions(
    nodes: RouteNodeWithFloor[],
  ): RouteInstructionDto[] {
    return nodes.map((node, index) => {
      const label = this.getNodeLabel(node);
      const isFirst = index === 0;
      const isLast = index === nodes.length - 1;

      if (isFirst) {
        return {
          order: index + 1,
          type: "START",
          title: `Начните маршрут от: ${label}`,
          description: "Стартовая точка маршрута.",
          nodeId: node.id,
          x: node.x,
          y: node.y,
          z: node.z ?? 0,
        };
      }

      if (isLast) {
        return {
          order: index + 1,
          type: "ARRIVE",
          title: `Вы прибыли: ${label}`,
          description: "Конечная точка маршрута.",
          nodeId: node.id,
          x: node.x,
          y: node.y,
          z: node.z ?? 0,
        };
      }

      return {
        order: index + 1,
        type: "MOVE",
        title: `Двигайтесь к: ${label}`,
        description: "Продолжайте движение к следующей точке маршрута.",
        nodeId: node.id,
        x: node.x,
        y: node.y,
        z: node.z ?? 0,
      };
    });
  }

  private createRouteMeta(params: {
    schemaVersion: string;
    purpose: string;
  }): RouteMetaDto {
    return {
      schemaVersion: params.schemaVersion,
      generatedAt: new Date().toISOString(),
      purpose: params.purpose,
      rendering: routeRenderingMeta,
    };
  }

  private getNodeLabel(node: RouteNodeWithFloor): string {
    return node.name ?? node.code ?? node.id;
  }

  private getRouteEdgeLabel(edge: RouteEdgeWithRelations): string | null {
    if (
      edge.metadata &&
      typeof edge.metadata === "object" &&
      !Array.isArray(edge.metadata) &&
      "label" in edge.metadata &&
      typeof edge.metadata.label === "string"
    ) {
      return edge.metadata.label;
    }

    return null;
  }

  private toTargetStoreResponse(
    store: RouteTargetStore,
    primaryRouteNodeId: string,
  ): RouteToStoreTargetStoreDto {
    const mapObjectIds = store.mapObjects.map((object) => object.id);
    const routeNodeIds = store.mapObjects.flatMap((object) =>
      object.routeNodes.map((node) => node.id),
    );
    const primaryRouteMapObject = store.mapObjects.find((object) =>
      object.routeNodes.some((node) => node.id === primaryRouteNodeId),
    );
    const primaryMapObject =
      store.mapObjects.find((object) =>
        isPrimaryStoreRelation(object.metadata, "mapObject", store.id),
      ) ??
      primaryRouteMapObject ??
      store.mapObjects[0] ??
      null;

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      roomNumber: store.roomNumber,
      categoryId: store.categoryId,
      category: store.category,
      mapObjectIds,
      routeNodeIds,
      primaryMapObjectId: primaryMapObject?.id ?? null,
      primaryRouteNodeId,
      searchKeywords: store.searchKeywords,
    };
  }
}









