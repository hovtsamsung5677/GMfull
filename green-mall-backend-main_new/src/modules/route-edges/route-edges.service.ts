import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RouteEdgeType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runSerializableTransaction } from "../../database/serializable-transaction";
import { CreateRouteEdgeDto } from "./dto/create-route-edge.dto";
import { RouteEdgeQueryDto } from "./dto/route-edge-query.dto";
import { RouteEdgeResponseDto } from "./dto/route-edge-response.dto";
import { UpdateRouteEdgeDto } from "./dto/update-route-edge.dto";
import {
  getRouteEdgeInvariantViolation,
  RouteEdgeInvariantState,
  VERTICAL_ROUTE_EDGE_TYPES,
} from "./route-edge-invariants";

const routeEdgeInclude = {
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
  fromNode: true,
  toNode: true,
} satisfies Prisma.RouteEdgeInclude;

type RouteEdgeWithRelations = Prisma.RouteEdgeGetPayload<{
  include: typeof routeEdgeInclude;
}>;

type RouteEdgeWriteClient = Pick<
  Prisma.TransactionClient,
  "floor" | "routeEdge" | "routeNode"
>;

@Injectable()
export class RouteEdgesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: RouteEdgeQueryDto): Promise<RouteEdgeResponseDto[]> {
    const edges = await this.prisma.routeEdge.findMany({
      where: this.buildWhere(query, true),
      include: routeEdgeInclude,
      orderBy: [{ createdAt: "asc" }],
      ...this.getPagination(query),
    });

    return edges.map((edge) => this.toResponse(edge));
  }

  async findAdmin(query: RouteEdgeQueryDto): Promise<RouteEdgeResponseDto[]> {
    const edges = await this.prisma.routeEdge.findMany({
      where: this.buildWhere(query),
      include: routeEdgeInclude,
      orderBy: [{ createdAt: "asc" }],
      ...this.getPagination(query),
    });

    return edges.map((edge) => this.toResponse(edge));
  }

  async findPublicByFloor(
    floorId: string,
    query: RouteEdgeQueryDto,
  ): Promise<RouteEdgeResponseDto[]> {
    await this.ensureFloorExists(floorId);

    return this.findPublic({ ...query, floorId });
  }

  async findAdminOne(id: string): Promise<RouteEdgeResponseDto> {
    return this.findOneOrThrow(id);
  }

  async create(dto: CreateRouteEdgeDto): Promise<RouteEdgeResponseDto> {
    return runSerializableTransaction(this.prisma, async (tx) => {
      const state: RouteEdgeInvariantState = {
        type: dto.type ?? RouteEdgeType.WALKWAY,
        floorId: dto.floorId ?? null,
        fromNodeId: dto.fromNodeId,
        toNodeId: dto.toNodeId,
      };

      await this.validateState(state, tx);

      const edge = await tx.routeEdge.create({
        data: {
          ...state,
          distance: dto.distance,
          weight: dto.weight,
          isBidirectional: dto.isBidirectional ?? true,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive ?? true,
        },
        include: routeEdgeInclude,
      });

      return this.toResponse(edge);
    });
  }

  async update(
    id: string,
    dto: UpdateRouteEdgeDto,
  ): Promise<RouteEdgeResponseDto> {
    return runSerializableTransaction(this.prisma, async (tx) => {
      const existing = await this.ensureExists(id, tx);
      const state: RouteEdgeInvariantState = {
        type: dto.type ?? existing.type,
        floorId: dto.floorId === undefined ? existing.floorId : dto.floorId,
        fromNodeId: dto.fromNodeId ?? existing.fromNodeId,
        toNodeId: dto.toNodeId ?? existing.toNodeId,
      };

      await this.validateState(state, tx);

      const edge = await tx.routeEdge.update({
        where: { id },
        data: {
          ...state,
          distance: dto.distance,
          weight: dto.weight,
          isBidirectional: dto.isBidirectional,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive,
        },
        include: routeEdgeInclude,
      });

      return this.toResponse(edge);
    });
  }

  async remove(id: string): Promise<RouteEdgeResponseDto> {
    await this.ensureExists(id);

    const edge = await this.prisma.routeEdge.update({
      where: { id },
      data: { isActive: false },
      include: routeEdgeInclude,
    });

    return this.toResponse(edge);
  }

  private buildWhere(
    query: RouteEdgeQueryDto,
    publicOnly = false,
  ): Prisma.RouteEdgeWhereInput {
    const where: Prisma.RouteEdgeWhereInput = {};

    if (publicOnly) {
      where.isActive = true;
      where.fromNode = { isActive: true };
      where.toNode = { isActive: true };
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.floorId) {
      where.AND = [
        {
          OR: [
            { floorId: query.floorId },
            {
              type: { in: [...VERTICAL_ROUTE_EDGE_TYPES] },
              OR: [
                { fromNode: { floorId: query.floorId } },
                { toNode: { floorId: query.floorId } },
              ],
            },
          ],
        },
      ];
    }

    if (query.fromNodeId) {
      where.fromNodeId = query.fromNodeId;
    }

    if (query.toNodeId) {
      where.toNodeId = query.toNodeId;
    }

    return where;
  }

  private async findOneOrThrow(id: string): Promise<RouteEdgeResponseDto> {
    const edge = await this.prisma.routeEdge.findUnique({
      where: { id },
      include: routeEdgeInclude,
    });

    if (!edge) {
      throw new NotFoundException("Route edge not found");
    }

    return this.toResponse(edge);
  }

  private async ensureExists(
    id: string,
    db: RouteEdgeWriteClient = this.prisma,
  ) {
    const edge = await db.routeEdge.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        floorId: true,
        fromNodeId: true,
        toNodeId: true,
      },
    });

    if (!edge) {
      throw new NotFoundException("Route edge not found");
    }

    return edge;
  }

  private async validateState(
    state: RouteEdgeInvariantState,
    db: RouteEdgeWriteClient = this.prisma,
  ): Promise<void> {
    const [floor, fromNode, toNode] = await Promise.all([
      state.floorId === null
        ? Promise.resolve(null)
        : db.floor.findUnique({
            where: { id: state.floorId },
            select: { id: true },
          }),
      db.routeNode.findUnique({
        where: { id: state.fromNodeId },
        select: { id: true, floorId: true, type: true },
      }),
      db.routeNode.findUnique({
        where: { id: state.toNodeId },
        select: { id: true, floorId: true, type: true },
      }),
    ]);

    if (state.floorId !== null && !floor) {
      throw new NotFoundException("Floor not found");
    }

    if (!fromNode) {
      throw new NotFoundException("From route node not found");
    }

    if (!toNode) {
      throw new NotFoundException("To route node not found");
    }

    const violation = getRouteEdgeInvariantViolation(state, fromNode, toNode);

    if (violation) {
      throw new BadRequestException(violation);
    }
  }

  private async ensureFloorExists(floorId: string): Promise<void> {
    const floor = await this.prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true },
    });

    if (!floor) {
      throw new NotFoundException("Floor not found");
    }
  }

  private getPagination(query: RouteEdgeQueryDto) {
    const page = query.page;
    const limit = query.limit;

    if (page == null && limit == null) {
      return undefined;
    }

    const safePage = Math.max(1, page ?? 1);
    const safeLimit = Math.max(1, limit ?? 50);

    return {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  }

  private toResponse(edge: RouteEdgeWithRelations): RouteEdgeResponseDto {
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
      fromNode: edge.fromNode,
      toNode: edge.toNode,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }
}
