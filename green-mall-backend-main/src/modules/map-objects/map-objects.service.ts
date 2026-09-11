import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RouteNodeType } from "@prisma/client";
import {
  isPrimaryStoreRelation,
  preserveStorePrimaryRelationMetadata,
} from "../../common/utils/store-primary.util";
import { PrismaService } from "../../database/prisma.service";
import {
  publicFileAssetSelect,
  toActivePublicFileAssetResponse,
} from "../file-assets/public-file-asset.projection";
import { FloorResponseDto } from "../floors/dto/floor-response.dto";
import { CreateMapObjectDto } from "./dto/create-map-object.dto";
import { MapObjectQueryDto } from "./dto/map-object-query.dto";
import { MapObjectResponseDto } from "./dto/map-object-response.dto";
import {
  PublicMapSceneCategoryDto,
  PublicMapSceneFloorDto,
  PublicMapSceneObjectDto,
  PublicMapSceneResponseDto,
  PublicMapSceneRouteEdgeDto,
  PublicMapSceneRouteNodeDto,
  PublicMapSceneStoreDto,
} from "./dto/public-map-scene-response.dto";
import { PublicMapResponseDto } from "./dto/public-map-response.dto";
import { UpdateMapObjectDto } from "./dto/update-map-object.dto";

const mapObjectInclude = {
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.MapObjectInclude;

type MapObjectWithRelations = Prisma.MapObjectGetPayload<{
  include: typeof mapObjectInclude;
}>;

const sceneFloorInclude = {
  mapAsset: { select: publicFileAssetSelect },
  modelAsset: { select: publicFileAssetSelect },
} satisfies Prisma.FloorInclude;

type SceneFloor = Prisma.FloorGetPayload<{
  include: typeof sceneFloorInclude;
}>;

const sceneStoreSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  roomNumber: true,
  categoryId: true,
  tenantId: true,
  floorId: true,
  workingHours: true,
  searchKeywords: true,
  logoAsset: { select: publicFileAssetSelect },
  coverAsset: { select: publicFileAssetSelect },
} satisfies Prisma.StoreSelect;

type SceneStore = Prisma.StoreGetPayload<{
  select: typeof sceneStoreSelect;
}>;

type MapObjectReferenceIds = {
  floorId?: string | null;
  storeId?: string | null;
  categoryId?: string | null;
};

@Injectable()
export class MapObjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: MapObjectQueryDto): Promise<MapObjectResponseDto[]> {
    const objects = await this.prisma.mapObject.findMany({
      where: this.buildWhere(query, true),
      include: mapObjectInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      ...this.getPagination(query),
    });

    return objects.map((object) => this.toResponse(object));
  }

  async findAdmin(query: MapObjectQueryDto): Promise<MapObjectResponseDto[]> {
    const objects = await this.prisma.mapObject.findMany({
      where: this.buildWhere(query),
      include: mapObjectInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      ...this.getPagination(query),
    });

    return objects.map((object) => this.toResponse(object));
  }

  async findPublicOne(id: string): Promise<MapObjectResponseDto> {
    return this.findOneOrThrow(id, true);
  }

  async findAdminOne(id: string): Promise<MapObjectResponseDto> {
    return this.findOneOrThrow(id);
  }

  async findPublicByFloor(floorId: string, query: MapObjectQueryDto) {
    await this.ensureFloorExists(floorId);

    return this.findPublic({
      ...query,
      floorId,
    });
  }

  async findPublicMap(): Promise<PublicMapResponseDto> {
    const [floors, objects] = await this.prisma.$transaction([
      this.prisma.floor.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
      }),
      this.prisma.mapObject.findMany({
        where: { isActive: true },
        include: mapObjectInclude,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    return {
      floors: floors as FloorResponseDto[],
      objects: objects.map((object) => this.toResponse(object)),
    };
  }

  async findPublicScene(floorId?: string): Promise<PublicMapSceneResponseDto> {
    const floor = floorId
      ? await this.prisma.floor.findFirst({
          where: { id: floorId, isActive: true },
          include: sceneFloorInclude,
        })
      : await this.prisma.floor.findFirst({
          where: { isActive: true },
          include: sceneFloorInclude,
          orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        });

    if (!floor) {
      throw new NotFoundException("Floor not found");
    }

    const [objects, routeNodes, routeEdges, categories, stores] =
      await this.prisma.$transaction([
        this.prisma.mapObject.findMany({
          where: {
            floorId: floor.id,
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
        this.prisma.routeNode.findMany({
          where: {
            floorId: floor.id,
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
        this.prisma.routeEdge.findMany({
          where: {
            floorId: floor.id,
            isActive: true,
            fromNode: { isActive: true },
            toNode: { isActive: true },
          },
          orderBy: [{ createdAt: "asc" }],
        }),
        this.prisma.category.findMany({
          where: {
            isActive: true,
            OR: [
              {
                mapObjects: {
                  some: {
                    floorId: floor.id,
                    isActive: true,
                  },
                },
              },
              {
                stores: {
                  some: {
                    isActive: true,
                    isVisible: true,
                    tenant: {
                      is: {
                        isActive: true,
                      },
                    },
                    OR: [
                      { floorId: floor.id },
                      {
                        mapObjects: {
                          some: {
                            floorId: floor.id,
                            isActive: true,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
        this.prisma.store.findMany({
          where: {
            isActive: true,
            isVisible: true,
            tenant: {
              is: {
                isActive: true,
              },
            },
            OR: [
              { floorId: floor.id },
              {
                mapObjects: {
                  some: {
                    floorId: floor.id,
                    isActive: true,
                  },
                },
              },
            ],
          },
          select: sceneStoreSelect,
          orderBy: [{ name: "asc" }],
        }),
      ]);

    return {
      floor: this.toSceneFloor(floor),
      objects: objects.map((object) => this.toSceneObject(object)),
      routeNodes: routeNodes.map((node) => this.toSceneRouteNode(node)),
      routeEdges: routeEdges.map((edge) => this.toSceneRouteEdge(edge)),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
      })),
      stores: stores.map((store) =>
        this.toSceneStore(store, objects, routeNodes),
      ),
      meta: {
        schemaVersion: "green-mall-map-scene/v1",
        generatedAt: new Date().toISOString(),
        purpose:
          "Frontend-ready 2D/3D mall map scene payload with navigation graph.",
      },
    };
  }

  async findPublicSceneByFloor(
    floorId: string,
  ): Promise<PublicMapSceneResponseDto> {
    return this.findPublicScene(floorId);
  }

  async create(dto: CreateMapObjectDto): Promise<MapObjectResponseDto> {
    await this.ensureReferencesExist({
      floorId: dto.floorId,
      storeId: dto.storeId,
      categoryId: dto.categoryId,
    });

    const object = await this.prisma.mapObject.create({
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        floorId: dto.floorId,
        storeId: dto.storeId,
        categoryId: dto.categoryId,
        x: dto.x,
        y: dto.y,
        z: dto.z,
        width: dto.width,
        height: dto.height,
        rotationX: dto.rotationX,
        rotationY: dto.rotationY,
        rotationZ: dto.rotationZ,
        scaleX: dto.scaleX,
        scaleY: dto.scaleY,
        scaleZ: dto.scaleZ,
        externalObjectId: dto.externalObjectId,
        geometry: this.getGeometryInput(dto),
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: mapObjectInclude,
    });

    return this.toResponse(object);
  }

  async update(
    id: string,
    dto: UpdateMapObjectDto,
  ): Promise<MapObjectResponseDto> {
    const existing = await this.ensureExists(id);
    await this.ensureReferencesExist(
      {
        floorId: dto.floorId ?? existing.floorId,
        storeId: dto.storeId === undefined ? existing.storeId : dto.storeId,
        categoryId:
          dto.categoryId === undefined ? existing.categoryId : dto.categoryId,
      },
      id,
    );

    const object = await this.prisma.mapObject.update({
      where: { id },
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        floorId: dto.floorId,
        storeId: dto.storeId,
        categoryId: dto.categoryId,
        x: dto.x,
        y: dto.y,
        z: dto.z,
        width: dto.width,
        height: dto.height,
        rotationX: dto.rotationX,
        rotationY: dto.rotationY,
        rotationZ: dto.rotationZ,
        scaleX: dto.scaleX,
        scaleY: dto.scaleY,
        scaleZ: dto.scaleZ,
        externalObjectId: dto.externalObjectId,
        geometry: this.getGeometryInput(dto),
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
      include: mapObjectInclude,
    });

    return this.toResponse(object);
  }

  async remove(id: string): Promise<MapObjectResponseDto> {
    await this.ensureExists(id);

    const object = await this.prisma.mapObject.update({
      where: { id },
      data: { isActive: false },
      include: mapObjectInclude,
    });

    return this.toResponse(object);
  }

  private buildWhere(
    query: MapObjectQueryDto,
    publicOnly = false,
  ): Prisma.MapObjectWhereInput {
    const where: Prisma.MapObjectWhereInput = {};

    if (publicOnly) {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.floorId) {
      where.floorId = query.floorId;
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private async findOneOrThrow(
    id: string,
    publicOnly = false,
  ): Promise<MapObjectResponseDto> {
    const object = await this.prisma.mapObject.findFirst({
      where: {
        id,
        ...(publicOnly ? { isActive: true } : {}),
      },
      include: mapObjectInclude,
    });

    if (!object) {
      throw new NotFoundException("Map object not found");
    }

    return this.toResponse(object);
  }

  private async ensureExists(id: string) {
    const object = await this.prisma.mapObject.findUnique({
      where: { id },
      select: {
        id: true,
        floorId: true,
        storeId: true,
        categoryId: true,
        metadata: true,
      },
    });

    if (!object) {
      throw new NotFoundException("Map object not found");
    }

    return object;
  }

  private async ensureReferencesExist(
    refs: MapObjectReferenceIds,
    mapObjectId?: string,
  ) {
    let resolvedFloorId: string | null = null;

    if (refs.floorId !== undefined && refs.floorId !== null) {
      const floor = await this.prisma.floor.findUnique({
        where: { id: refs.floorId },
      });

      if (!floor) {
        throw new NotFoundException("Floor not found");
      }

      resolvedFloorId = refs.floorId;
    }

    if (refs.storeId !== undefined && refs.storeId !== null) {
      const store = await this.prisma.store.findUnique({
        where: { id: refs.storeId },
        select: { id: true, floorId: true },
      });

      if (!store) {
        throw new NotFoundException("Store not found");
      }

      if (
        resolvedFloorId !== null &&
        store.floorId !== null &&
        store.floorId !== resolvedFloorId
      ) {
        throw new BadRequestException(
          "Store and map object must belong to the same floor",
        );
      }
    }

    if (refs.categoryId !== undefined && refs.categoryId !== null) {
      const category = await this.prisma.category.findUnique({
        where: { id: refs.categoryId },
      });

      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    if (mapObjectId && resolvedFloorId !== null) {
      const routeNodeOnAnotherFloor = await this.prisma.routeNode.findFirst({
        where: {
          mapObjectId,
          floorId: { not: resolvedFloorId },
        },
        select: { id: true },
      });

      if (routeNodeOnAnotherFloor) {
        throw new BadRequestException(
          "Map object and linked route nodes must belong to the same floor",
        );
      }
    }
  }

  private getGeometryInput(
    dto: Pick<CreateMapObjectDto, "polygonData" | "geometry">,
  ): Prisma.InputJsonValue | undefined {
    if (dto.polygonData !== undefined && dto.geometry !== undefined) {
      throw new BadRequestException(
        "Provide either polygonData or geometry, not both",
      );
    }

    const geometry =
      dto.polygonData !== undefined ? dto.polygonData : dto.geometry;

    return geometry as Prisma.InputJsonValue | undefined;
  }

  private async ensureFloorExists(floorId: string): Promise<void> {
    const floor = await this.prisma.floor.findUnique({
      where: { id: floorId },
    });

    if (!floor) {
      throw new NotFoundException("Floor not found");
    }
  }

  private getPagination(query: MapObjectQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private toResponse(object: MapObjectWithRelations): MapObjectResponseDto {
    return {
      id: object.id,
      type: object.type,
      name: object.name,
      description: object.description,
      floorId: object.floorId,
      storeId: object.storeId,
      categoryId: object.categoryId,
      x: object.x,
      y: object.y,
      z: object.z,
      width: object.width,
      height: object.height,
      rotationX: object.rotationX,
      rotationY: object.rotationY,
      rotationZ: object.rotationZ,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      scaleZ: object.scaleZ,
      externalObjectId: object.externalObjectId,
      polygonData: object.geometry,
      metadata: object.metadata,
      sortOrder: object.sortOrder,
      isActive: object.isActive,
      floor: object.floor,
      store: object.store,
      category: object.category,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
    };
  }

  private toSceneFloor(floor: SceneFloor): PublicMapSceneFloorDto {
    return {
      id: floor.id,
      number: floor.number,
      name: floor.name,
      width: floor.width,
      height: floor.height,
      depth: floor.depth,
      unit: floor.unit,
      mapImageUrl: floor.mapImageUrl,
      mapAssetId: floor.mapAssetId,
      modelAssetId: floor.modelAssetId,
      mapAsset: toActivePublicFileAssetResponse(floor.mapAsset),
      modelAsset: toActivePublicFileAssetResponse(floor.modelAsset),
      metadata: floor.metadata,
    };
  }

  private toSceneObject(
    object: Prisma.MapObjectGetPayload<Record<string, never>>,
  ): PublicMapSceneObjectDto {
    return {
      id: object.id,
      type: object.type,
      name: object.name,
      description: object.description,
      floorId: object.floorId,
      storeId: object.storeId,
      categoryId: object.categoryId,
      x: object.x,
      y: object.y,
      z: object.z,
      width: object.width,
      height: object.height,
      rotationX: object.rotationX,
      rotationY: object.rotationY,
      rotationZ: object.rotationZ,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      scaleZ: object.scaleZ,
      externalObjectId: object.externalObjectId,
      polygonData: object.geometry,
      metadata: object.metadata,
      sortOrder: object.sortOrder,
    };
  }

  private toSceneRouteNode(
    node: Prisma.RouteNodeGetPayload<Record<string, never>>,
  ): PublicMapSceneRouteNodeDto {
    return {
      id: node.id,
      floorId: node.floorId,
      type: node.type,
      code: node.code,
      name: node.name,
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
    };
  }

  private toSceneRouteEdge(
    edge: Prisma.RouteEdgeGetPayload<Record<string, never>>,
  ): PublicMapSceneRouteEdgeDto {
    return {
      id: edge.id,
      floorId: edge.floorId,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      distance: edge.distance,
      weight: edge.weight,
      isBidirectional: edge.isBidirectional,
      metadata: edge.metadata,
    };
  }

  private toSceneStore(
    store: SceneStore,
    objects: Prisma.MapObjectGetPayload<Record<string, never>>[],
    routeNodes: Prisma.RouteNodeGetPayload<Record<string, never>>[],
  ): PublicMapSceneStoreDto {
    const storeObjects = objects.filter(
      (object) => object.storeId === store.id,
    );
    const mapObjectIds = storeObjects.map((object) => object.id);
    const storeRouteNodes = routeNodes.filter(
      (node) =>
        node.mapObjectId !== null && mapObjectIds.includes(node.mapObjectId),
    );
    const routeNodeIds = storeRouteNodes.map((node) => node.id);
    const primaryRouteNode =
      storeRouteNodes.find((node) =>
        isPrimaryStoreRelation(node.metadata, "routeNode", store.id),
      ) ??
      storeRouteNodes.find(
        (node) => node.type === RouteNodeType.STORE_ANCHOR,
      ) ??
      storeRouteNodes[0] ??
      null;
    const primaryMapObject =
      storeObjects.find((object) =>
        isPrimaryStoreRelation(object.metadata, "mapObject", store.id),
      ) ??
      storeObjects.find(
        (object) => object.id === primaryRouteNode?.mapObjectId,
      ) ??
      storeObjects[0] ??
      null;

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      roomNumber: store.roomNumber,
      categoryId: store.categoryId,
      tenantId: store.tenantId,
      floorId: store.floorId,
      mapObjectIds,
      routeNodeIds,
      primaryMapObjectId: primaryMapObject?.id ?? null,
      primaryRouteNodeId: primaryRouteNode?.id ?? null,
      logoAsset: toActivePublicFileAssetResponse(store.logoAsset),
      coverAsset: toActivePublicFileAssetResponse(store.coverAsset),
      workingHours: store.workingHours,
      searchKeywords: store.searchKeywords,
    };
  }
}
