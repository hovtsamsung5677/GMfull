import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MapObjectType, Prisma, RouteNodeType } from '@prisma/client';
import { isEvacuationStairNode } from '../../common/utils/evacuation.util';
import { preserveStorePrimaryRelationMetadata } from '../../common/utils/store-primary.util';
import { PrismaService } from '../../database/prisma.service';
import { CreateRouteNodeDto } from './dto/create-route-node.dto';
import { RouteGraphResponseDto } from './dto/route-graph-response.dto';
import { RouteEdgeResponseDto } from '../route-edges/dto/route-edge-response.dto';
import { RouteNodeQueryDto } from './dto/route-node-query.dto';
import { RouteNodeResponseDto } from './dto/route-node-response.dto';
import { UpdateRouteNodeDto } from './dto/update-route-node.dto';

const routeNodeInclude = {
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
} satisfies Prisma.RouteNodeInclude;

type RouteNodeWithFloor = Prisma.RouteNodeGetPayload<{
  include: typeof routeNodeInclude;
}>;

type RouteNodeWriteClient = Pick<
  Prisma.TransactionClient,
  'floor' | 'mapObject' | 'panel' | 'routeEdge' | 'routeNode'
>;

const routeGraphEdgeInclude = {
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

type RouteGraphEdgeWithRelations = Prisma.RouteEdgeGetPayload<{
  include: typeof routeGraphEdgeInclude;
}>;

@Injectable()
export class RouteNodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: RouteNodeQueryDto): Promise<RouteNodeResponseDto[]> {
    const nodes = await this.prisma.routeNode.findMany({
      where: this.buildWhere(query, true),
      include: routeNodeInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      ...this.getPagination(query),
    });

    return nodes.map((node) => this.toResponse(node));
  }

  async findAdmin(query: RouteNodeQueryDto): Promise<RouteNodeResponseDto[]> {
    const nodes = await this.prisma.routeNode.findMany({
      where: this.buildWhere(query),
      include: routeNodeInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      ...this.getPagination(query),
    });

    return nodes.map((node) => this.toResponse(node));
  }

  async findPublicByFloor(
    floorId: string,
    query: RouteNodeQueryDto,
  ): Promise<RouteNodeResponseDto[]> {
    await this.ensureFloorExists(floorId);

    return this.findPublic({ ...query, floorId });
  }

  /**
   * Пожарные (эвакуационные) лестницы этажа: активные узлы типа STAIRS
   * с metadata.isEvacuation. Панель рисует по ним маркеры на 3D-модели.
   */
  async findEvacuationStairsByFloor(
    floorId: string,
  ): Promise<RouteNodeResponseDto[]> {
    await this.ensureFloorExists(floorId);

    const nodes = await this.prisma.routeNode.findMany({
      where: {
        floorId,
        isActive: true,
        type: RouteNodeType.STAIRS,
      },
      include: routeNodeInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return nodes.filter(isEvacuationStairNode).map((node) => this.toResponse(node));
  }

  async findPublicRouteGraph(floorId: string): Promise<RouteGraphResponseDto> {
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, isActive: true },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    const [nodes, edges] = await this.prisma.$transaction([
      this.prisma.routeNode.findMany({
        where: { floorId, isActive: true },
        include: routeNodeInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.routeEdge.findMany({
        where: { floorId, isActive: true },
        include: routeGraphEdgeInclude,
        orderBy: [{ createdAt: 'asc' }],
      }),
    ]);

    return {
      floor,
      nodes: nodes.map((node) => this.toResponse(node)),
      edges: edges.map((edge) => this.toRouteEdgeResponse(edge)),
    };
  }

  async findAdminOne(id: string): Promise<RouteNodeResponseDto> {
    return this.findOneOrThrow(id);
  }

  async create(dto: CreateRouteNodeDto): Promise<RouteNodeResponseDto> {
    await this.ensureFloorExists(dto.floorId);
    await this.ensureMapObjectExists(dto.mapObjectId, dto.floorId);

    const node = await this.prisma.routeNode.create({
      data: {
        floorId: dto.floorId,
        type: dto.type,
        name: dto.name,
        code: dto.code,
        x: dto.x,
        y: dto.y,
        z: dto.z,
        rotationX: dto.rotationX,
        rotationY: dto.rotationY,
        rotationZ: dto.rotationZ,
        scaleX: dto.scaleX,
        scaleY: dto.scaleY,
        scaleZ: dto.scaleZ,
        mapObjectId: dto.mapObjectId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: routeNodeInclude,
    });

    if (
      (node.type === 'ELEVATOR' ||
        node.type === 'ESCALATOR' ||
        node.type === 'STAIRS') &&
      !node.mapObjectId
    ) {
      const mapObject = await this.prisma.mapObject.create({
        data: {
          type:
            node.type === RouteNodeType.STAIRS
              ? MapObjectType.STAIRS
              : MapObjectType.ELEVATOR,
          name: node.name || node.type,
          floorId: node.floorId,
          storeId: null,
        },
      });
      await this.prisma.routeNode.update({
        where: { id: node.id },
        data: { mapObjectId: mapObject.id },
      });
      node.mapObjectId = mapObject.id;
    }

    return this.toResponse(node);
  }

  async update(
    id: string,
    dto: UpdateRouteNodeDto,
  ): Promise<RouteNodeResponseDto> {
    const existing = await this.ensureExists(id);
    const floorId = dto.floorId ?? existing.floorId;
    const mapObjectId =
      dto.mapObjectId === undefined ? existing.mapObjectId : dto.mapObjectId;

    await this.ensureFloorExists(floorId);
    await this.ensureMapObjectExists(mapObjectId, floorId);
    await this.ensureActivePanelInvariant(
      id,
      floorId,
      dto.type ?? existing.type,
      dto.isActive ?? existing.isActive,
    );

    let effectiveMapObjectId = mapObjectId;
    if (
      (dto.type === 'ELEVATOR' ||
        dto.type === 'ESCALATOR' ||
        dto.type === 'STAIRS') &&
      !effectiveMapObjectId
    ) {
      const created = await this.prisma.mapObject.create({
        data: {
          type:
            (dto.type ?? existing.type) === RouteNodeType.STAIRS
              ? MapObjectType.STAIRS
              : MapObjectType.ELEVATOR,
          name: dto.name || dto.type || 'Elevator',
          floorId: floorId,
          storeId: null,
        },
      });
      effectiveMapObjectId = created.id;
    }

    const node = await this.prisma.routeNode.update({
      where: { id },
      data: {
        floorId: dto.floorId,
        type: dto.type,
        name: dto.name,
        code: dto.code,
        x: dto.x,
        y: dto.y,
        z: dto.z,
        rotationX: dto.rotationX,
        rotationY: dto.rotationY,
        rotationZ: dto.rotationZ,
        scaleX: dto.scaleX,
        scaleY: dto.scaleY,
        scaleZ: dto.scaleZ,
        mapObjectId: effectiveMapObjectId ?? undefined,
        metadata:
          dto.metadata === undefined
            ? undefined
            : preserveStorePrimaryRelationMetadata(
                existing.metadata,
                dto.metadata,
              ),
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: routeNodeInclude,
    });

    if (
      (node.type === 'ELEVATOR' ||
        node.type === 'ESCALATOR' ||
        node.type === 'STAIRS') &&
      !node.mapObjectId
    ) {
      const mapObject = await this.prisma.mapObject.create({
        data: {
          type:
            node.type === RouteNodeType.STAIRS
              ? MapObjectType.STAIRS
              : MapObjectType.ELEVATOR,
          name: node.name || node.type,
          floorId: node.floorId,
          storeId: null,
        },
      });
      await this.prisma.routeNode.update({
        where: { id: node.id },
        data: { mapObjectId: mapObject.id },
      });
      node.mapObjectId = mapObject.id;
    }

    return this.toResponse(node);
  }

  async remove(id: string): Promise<RouteNodeResponseDto> {
    await this.ensureExists(id);

    const node = await this.prisma.routeNode.delete({
      where: { id },
      include: routeNodeInclude,
    });

    return this.toResponse(node);
  }

  private buildWhere(
    query: RouteNodeQueryDto,
    publicOnly = false,
  ): Prisma.RouteNodeWhereInput {
    const where: Prisma.RouteNodeWhereInput = {};

    if (publicOnly) {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.floorId) {
      where.floorId = query.floorId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async findOneOrThrow(id: string): Promise<RouteNodeResponseDto> {
    const node = await this.prisma.routeNode.findUnique({
      where: { id },
      include: routeNodeInclude,
    });

    if (!node) {
      throw new NotFoundException('Route node not found');
    }

    return this.toResponse(node);
  }

  private async ensureExists(id: string) {
    const node = await this.prisma.routeNode.findUnique({
      where: { id },
      select: { id: true, floorId: true, type: true, isActive: true, mapObjectId: true, metadata: true },
    });

    if (!node) {
      throw new NotFoundException('Route node not found');
    }

    return node;
  }

  private async ensureFloorExists(floorId: string): Promise<void> {
    const floor = await this.prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }
  }

  private async ensureMapObjectExists(
    mapObjectId?: string | null,
    floorId?: string,
  ): Promise<void> {
    if (mapObjectId === undefined || mapObjectId === null) {
      return;
    }

    const mapObject = await this.prisma.mapObject.findUnique({
      where: { id: mapObjectId },
      select: { id: true, floorId: true },
    });

    if (!mapObject) {
      throw new NotFoundException('Map object not found');
    }

    if (floorId !== undefined && mapObject.floorId !== floorId) {
      throw new BadRequestException(
        'Route node and map object must belong to the same floor',
      );
    }
  }

  private async ensureActivePanelInvariant(
    routeNodeId: string,
    floorId: string,
    type: RouteNodeType,
    isActive: boolean,
    db: RouteNodeWriteClient = this.prisma,
  ): Promise<void> {
    const panel = await db.panel.findUnique({
      where: { routeNodeId },
      select: { floorId: true, isActive: true },
    });

    if (!panel?.isActive) {
      return;
    }

    if (!isActive) {
      throw new ConflictException(
        "Cannot deactivate route node because its Panel is active",
      );
    }

    if (type !== RouteNodeType.PANEL || panel.floorId !== floorId) {
      throw new ConflictException(
        "Route node update would make its active Panel configuration inconsistent",
      );
    }
  }

  private getPagination(query: RouteNodeQueryDto) {
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

  private toResponse(node: RouteNodeWithFloor): RouteNodeResponseDto {
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
    edge: RouteGraphEdgeWithRelations,
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
      fromNode: edge.fromNode,
      toNode: edge.toNode,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    };
  }
}








