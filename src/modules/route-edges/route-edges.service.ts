import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateRouteEdgeDto } from "./dto/create-route-edge.dto";
import { RouteEdgeQueryDto } from "./dto/route-edge-query.dto";
import { RouteEdgeResponseDto } from "./dto/route-edge-response.dto";
import { UpdateRouteEdgeDto } from "./dto/update-route-edge.dto";

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

type RouteEdgeReferences = {
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
};

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
    await this.ensureReferencesExist({
      floorId: dto.floorId,
      fromNodeId: dto.fromNodeId,
      toNodeId: dto.toNodeId,
    });

    try {
      const edge = await this.prisma.routeEdge.create({
        data: {
          floorId: dto.floorId,
          fromNodeId: dto.fromNodeId,
          toNodeId: dto.toNodeId,
          distance: dto.distance,
          weight: dto.weight,
          isBidirectional: dto.isBidirectional ?? true,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive ?? true,
        },
        include: routeEdgeInclude,
      });

      return this.toResponse(edge);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateRouteEdgeDto,
  ): Promise<RouteEdgeResponseDto> {
    const existing = await this.ensureExists(id);
    await this.ensureReferencesExist({
      floorId: dto.floorId ?? existing.floorId,
      fromNodeId: dto.fromNodeId ?? existing.fromNodeId,
      toNodeId: dto.toNodeId ?? existing.toNodeId,
    });

    try {
      const edge = await this.prisma.routeEdge.update({
        where: { id },
        data: {
          floorId: dto.floorId,
          fromNodeId: dto.fromNodeId,
          toNodeId: dto.toNodeId,
          distance: dto.distance,
          weight: dto.weight,
          isBidirectional: dto.isBidirectional,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive,
        },
        include: routeEdgeInclude,
      });

      return this.toResponse(edge);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<RouteEdgeResponseDto> {
    await this.ensureExists(id);

    const edge = await this.prisma.routeEdge.delete({
      where: { id },
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
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.floorId) {
      where.floorId = query.floorId;
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

  private async ensureExists(id: string) {
    const edge = await this.prisma.routeEdge.findUnique({
      where: { id },
      select: {
        id: true,
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

  private async ensureReferencesExist(refs: RouteEdgeReferences) {
    const [floor, fromNode, toNode] = await this.prisma.$transaction([
      this.prisma.floor.findUnique({
        where: { id: refs.floorId },
        select: { id: true },
      }),
      this.prisma.routeNode.findUnique({
        where: { id: refs.fromNodeId },
        select: { id: true, floorId: true },
      }),
      this.prisma.routeNode.findUnique({
        where: { id: refs.toNodeId },
        select: { id: true, floorId: true },
      }),
    ]);

    if (!floor) {
      throw new NotFoundException("Floor not found");
    }

    if (!fromNode) {
      throw new NotFoundException("From route node not found");
    }

    if (!toNode) {
      throw new NotFoundException("To route node not found");
    }

    if (fromNode.id === toNode.id) {
      throw new BadRequestException(
        "Route edge must connect two different route nodes",
      );
    }

    if (fromNode.floorId !== refs.floorId) {
      throw new BadRequestException(
        "From route node must belong to the selected floor",
      );
    }

    if (toNode.floorId !== refs.floorId) {
      throw new BadRequestException(
        "To route node must belong to the selected floor",
      );
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

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException(
          "Route edge already exists between these route nodes",
        );
      }

      if (error.code === "P2003") {
        throw new BadRequestException(
          "A referenced route edge entity no longer exists",
        );
      }
    }

    throw error;
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
