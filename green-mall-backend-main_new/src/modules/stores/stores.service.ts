import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, MapObjectType, RouteNodeType } from "@prisma/client";
import {
  isPrimaryStoreRelation,
  updatePrimaryStoreRelationMetadata,
} from "../../common/utils/store-primary.util";
import { slugify } from "../../common/utils/slugify.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { StoreAdminResponseDto } from "./dto/store-admin-response.dto";
import { StoreSearchQueryDto } from "./dto/store-search-query.dto";
import { StoreSearchResponseDto } from "./dto/store-search-response.dto";
import { StoreQueryDto } from "./dto/store-query.dto";
import { StoreResponseDto } from "./dto/store-response.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";

const storeInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
    },
  },
} satisfies Prisma.StoreInclude;

type StoreWithRelations = Prisma.StoreGetPayload<{
  include: typeof storeInclude;
}>;

const storeAdminInclude = {
  ...storeInclude,
  mapObjects: {
    select: {
      id: true,
      floorId: true,
      metadata: true,
      sortOrder: true,
      name: true,
      routeNodes: {
        select: {
          id: true,
          floorId: true,
          mapObjectId: true,
          type: true,
          metadata: true,
          sortOrder: true,
          createdAt: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  },
} satisfies Prisma.StoreInclude;

type StoreAdminWithRelations = Prisma.StoreGetPayload<{
  include: typeof storeAdminInclude;
}>;

const storeSearchInclude = {
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
          createdAt: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  },
} satisfies Prisma.StoreInclude;

type StoreSearchWithRelations = Prisma.StoreGetPayload<{
  include: typeof storeSearchInclude;
}>;

type StoreMapRelationInput = {
  mapObjectIds?: string[];
  routeNodeIds?: string[];
  primaryMapObjectId?: string | null;
  primaryRouteNodeId?: string | null;
};

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: StoreQueryDto): Promise<StoreResponseDto[]> {
    const stores = await this.prisma.store.findMany({
      where: this.buildWhere(query, true),
      include: storeInclude,
      orderBy: [{ name: "asc" }],
      ...this.getPagination(query),
    });

    return stores.map((store) => this.toResponse(store));
  }

  async searchPublic(
    query: StoreSearchQueryDto,
  ): Promise<StoreSearchResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const search = query.query?.trim();

    const where: Prisma.StoreWhereInput = {
      isActive: true,
      isVisible: true,
      tenant: {
        is: {
          isActive: true,
        },
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { searchKeywords: { contains: search, mode: "insensitive" } },
              { roomNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const stores = await this.prisma.store.findMany({
      where,
      include: storeSearchInclude,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return stores.map((store) => this.toSearchResponse(store));
  }

  async findAdmin(query: StoreQueryDto): Promise<StoreAdminResponseDto[]> {
    const stores = await this.prisma.store.findMany({
      where: this.buildWhere(query),
      include: storeAdminInclude,
      orderBy: [{ createdAt: "desc" }],
      ...this.getPagination(query),
    });

    return stores.map((store) => this.toAdminResponse(store));
  }

  async findPublicOne(id: string): Promise<StoreResponseDto> {
    return this.findOneOrThrow(id, true);
  }

  async findOne(id: string): Promise<StoreAdminResponseDto> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: storeAdminInclude,
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return this.toAdminResponse(store);
  }

  async create(dto: CreateStoreDto): Promise<StoreAdminResponseDto> {
    await this.ensureReferencesExist(dto, dto.isActive ?? true);
    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const store = await this.prisma.$transaction(async (tx) => {
        const created = await tx.store.create({
          data: {
            name: dto.name,
            slug,
            tenantId: dto.tenantId,
            categoryId: dto.categoryId,
            floorId: dto.floorId,
            description: dto.description,
            roomNumber: dto.roomNumber,
            phone: dto.phone,
            email: dto.email,
            website: dto.website,
            workingHours: dto.workingHours as Prisma.InputJsonValue | undefined,
            searchKeywords: dto.searchKeywords,
            logoAssetId: dto.logoAssetId,
            coverAssetId: dto.coverAssetId,
            isActive: dto.isActive ?? true,
            isVisible: dto.isVisible ?? true,
          },
        });

        const hasRelationInput =
          dto.mapObjectIds !== undefined || dto.routeNodeIds !== undefined;

        let autoMapObjectId: string | null = null;
        let autoRouteNodeId: string | null = null;

        if (created.floorId && !hasRelationInput) {
          const mapObject = await tx.mapObject.create({
            data: {
              type: MapObjectType.STORE,
              name: created.name,
              floorId: created.floorId,
              storeId: created.id,
              x: 0,
              y: 0,
              isActive: true,
            },
          });
          autoMapObjectId = mapObject.id;

          const routeNode = await tx.routeNode.create({
            data: {
              floorId: created.floorId,
              type: RouteNodeType.STORE_ANCHOR,
              name: created.name,
              mapObjectId: mapObject.id,
              x: 0,
              y: 0,
              isActive: true,
            },
          });
          autoRouteNodeId = routeNode.id;
        }

        await this.syncStoreMapRelations(
          tx,
          created.id,
          {
            mapObjectIds: dto.mapObjectIds ?? (autoMapObjectId ? [autoMapObjectId] : undefined),
            routeNodeIds: dto.routeNodeIds ?? (autoRouteNodeId ? [autoRouteNodeId] : undefined),
            primaryMapObjectId: dto.primaryMapObjectId ?? autoMapObjectId,
            primaryRouteNodeId: dto.primaryRouteNodeId ?? autoRouteNodeId,
          },
          dto.floorId ?? null,
        );

        return this.findAdminStoreOrThrow(tx, created.id);
      });

      return this.toAdminResponse(store);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateStoreDto,
    userId: string,
  ): Promise<StoreAdminResponseDto> {
    const existing = await this.ensureExists(id);
    const tenantChanged =
      dto.tenantId !== undefined && dto.tenantId !== existing.tenantId;

    if (tenantChanged) {
      await this.ensureTenantChangeAllowed(id);
    }

    await this.ensureReferencesExist(
      dto,
      tenantChanged && (dto.isActive ?? existing.isActive),
    );
    const slug = dto.slug
      ? await this.resolveSlug(dto.slug, dto.slug, id, true)
      : undefined;
    const effectiveFloorId =
      dto.floorId === undefined ? existing.floorId : dto.floorId;

    try {
      const store = await this.prisma.$transaction(async (tx) => {
        await tx.store.update({
          where: { id },
          data: {
            name: dto.name,
            slug,
            tenantId: dto.tenantId,
            categoryId: dto.categoryId,
            floorId: dto.floorId,
            description: dto.description,
            roomNumber: dto.roomNumber,
            phone: dto.phone,
            email: dto.email,
            website: dto.website,
            workingHours: dto.workingHours as Prisma.InputJsonValue | undefined,
            searchKeywords: dto.searchKeywords,
            logoAssetId: dto.logoAssetId,
            coverAssetId: dto.coverAssetId,
            isActive: dto.isActive,
            isVisible: dto.isVisible,
          },
        });

        if (existing.isActive && dto.isActive === false) {
          await tx.promotion.updateMany({
            where: {
              storeId: id,
              isActive: true,
              deletedAt: null,
            },
            data: {
              isActive: false,
              updatedById: userId,
            },
          });
        }

        await this.syncStoreMapRelations(
          tx,
          id,
          dto,
          effectiveFloorId,
          dto.floorId !== undefined,
        );

        return this.findAdminStoreOrThrow(tx, id);
      });

      return this.toAdminResponse(store);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, userId: string): Promise<StoreAdminResponseDto> {
    const existing = await this.ensureExists(id);

    if (!existing.isActive) {
      return this.findOne(id);
    }

    const store = await this.prisma.$transaction(async (tx) => {
      await tx.store.update({
        where: { id },
        data: { isActive: false },
      });
      await tx.promotion.updateMany({
        where: {
          storeId: id,
          isActive: true,
          deletedAt: null,
        },
        data: {
          isActive: false,
          updatedById: userId,
        },
      });

      return this.findAdminStoreOrThrow(tx, id);
    });

    return this.toAdminResponse(store);
  }

  private buildWhere(
    query: StoreQueryDto,
    publicOnly = false,
  ): Prisma.StoreWhereInput {
    const where: Prisma.StoreWhereInput = {};

    if (publicOnly) {
      where.isActive = true;
      where.isVisible = true;
      where.tenant = {
        is: {
          isActive: true,
        },
      };
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.floorId) {
      where.floorId = query.floorId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { searchKeywords: { contains: query.search, mode: "insensitive" } },
        { roomNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private async findOneOrThrow(
    id: string,
    publicOnly = false,
  ): Promise<StoreResponseDto> {
    const store = await this.prisma.store.findFirst({
      where: {
        id,
        ...(publicOnly
          ? {
              isActive: true,
              isVisible: true,
              tenant: {
                is: {
                  isActive: true,
                },
              },
            }
          : {}),
      },
      include: storeInclude,
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return this.toResponse(store);
  }

  private async ensureExists(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        floorId: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return store;
  }

  private async ensureReferencesExist(
    dto: Pick<
      CreateStoreDto,
      "tenantId" | "categoryId" | "floorId" | "logoAssetId" | "coverAssetId"
    >,
    requireActiveTenant = false,
  ): Promise<void> {
    if (dto.tenantId !== null && dto.tenantId !== undefined) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: dto.tenantId },
        select: { id: true, isActive: true },
      });

      if (!tenant) {
        throw new NotFoundException("Tenant not found");
      }

      if (requireActiveTenant && !tenant.isActive) {
        throw new BadRequestException(
          "An active store requires an active tenant",
        );
      }
    }

    if (dto.categoryId !== null && dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    if (dto.floorId !== null && dto.floorId !== undefined) {
      const floor = await this.prisma.floor.findUnique({
        where: { id: dto.floorId },
        select: { id: true },
      });

      if (!floor) {
        throw new NotFoundException("Floor not found");
      }
    }

    await this.ensureActiveFileAssetExists(dto.logoAssetId, "Store logo asset");
    await this.ensureActiveFileAssetExists(
      dto.coverAssetId,
      "Store cover asset",
    );
  }

  private async ensureTenantChangeAllowed(storeId: string): Promise<void> {
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        storeId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (promotion) {
      throw new ConflictException(
        "Store tenant cannot be changed while non-deleted promotions exist. Delete, reassign, or otherwise handle the store promotions first.",
      );
    }
  }

  private async ensureActiveFileAssetExists(
    assetId: string | null | undefined,
    assetName: string,
  ): Promise<void> {
    if (assetId === null || assetId === undefined) {
      return;
    }

    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: assetId, isActive: true },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException(`${assetName} not found or inactive`);
    }
  }

  private async syncStoreMapRelations(
    tx: Prisma.TransactionClient,
    storeId: string,
    dto: StoreMapRelationInput,
    floorId: string | null,
    validateExistingFloor = false,
  ): Promise<void> {
    const hasRelationInput =
      dto.mapObjectIds !== undefined ||
      dto.routeNodeIds !== undefined ||
      dto.primaryMapObjectId !== undefined ||
      dto.primaryRouteNodeId !== undefined;

    if (!hasRelationInput && !validateExistingFloor) {
      return;
    }

    const currentMapObjects = await tx.mapObject.findMany({
      where: { storeId },
      select: { id: true },
    });
    const replacesMapObjects = dto.mapObjectIds !== undefined;
    const desiredMapObjectIds = new Set(
      replacesMapObjects
        ? dto.mapObjectIds
        : currentMapObjects.map((object) => object.id),
    );

    if (dto.primaryMapObjectId) {
      if (
        replacesMapObjects &&
        !desiredMapObjectIds.has(dto.primaryMapObjectId)
      ) {
        throw new BadRequestException(
          "primaryMapObjectId must be included in mapObjectIds",
        );
      }

      desiredMapObjectIds.add(dto.primaryMapObjectId);
    }

    const requestedRouteNodeIds = new Set(dto.routeNodeIds ?? []);

    if (dto.primaryRouteNodeId) {
      requestedRouteNodeIds.add(dto.primaryRouteNodeId);
    }

    const requestedRouteNodes = requestedRouteNodeIds.size
      ? await tx.routeNode.findMany({
          where: { id: { in: [...requestedRouteNodeIds] } },
          select: {
            id: true,
            floorId: true,
            mapObjectId: true,
            type: true,
          },
        })
      : [];

    if (requestedRouteNodes.length !== requestedRouteNodeIds.size) {
      throw new NotFoundException("Route node not found");
    }

    for (const node of requestedRouteNodes) {
      if (node.mapObjectId === null) {
        throw new BadRequestException(
          "Route node must be linked to a map object before linking it to a store",
        );
      }

      if (replacesMapObjects && !desiredMapObjectIds.has(node.mapObjectId)) {
        throw new BadRequestException(
          "Route node mapObjectId must be included in mapObjectIds",
        );
      }

      desiredMapObjectIds.add(node.mapObjectId);
    }

    const desiredMapObjects = desiredMapObjectIds.size
      ? await tx.mapObject.findMany({
          where: { id: { in: [...desiredMapObjectIds] } },
          select: {
            id: true,
            floorId: true,
            storeId: true,
            routeNodes: {
              select: { id: true, floorId: true },
            },
          },
        })
      : [];

    if (desiredMapObjects.length !== desiredMapObjectIds.size) {
      throw new NotFoundException("Map object not found");
    }

    const mapObjectById = new Map(
      desiredMapObjects.map((object) => [object.id, object]),
    );

    for (const object of desiredMapObjects) {
      if (object.storeId !== null && object.storeId !== storeId) {
        throw new ConflictException(
          "Map object is already linked to another store",
        );
      }

      if (
        object.routeNodes.some((node) => node.floorId !== object.floorId)
      ) {
        throw new BadRequestException(
          "Map object and linked route nodes must belong to the same floor",
        );
      }
    }

    for (const node of requestedRouteNodes) {
      const mapObject = mapObjectById.get(node.mapObjectId!);

      if (!mapObject) {
        throw new BadRequestException(
          "Route node must be linked through a selected map object",
        );
      }

      if (node.floorId !== mapObject.floorId) {
        throw new BadRequestException(
          "Route node and map object must belong to the same floor",
        );
      }
    }

    if (dto.primaryRouteNodeId) {
      const primaryRouteNode = requestedRouteNodes.find(
        (node) => node.id === dto.primaryRouteNodeId,
      );

      if (primaryRouteNode?.type !== RouteNodeType.STORE_ANCHOR) {
        throw new BadRequestException(
          "primaryRouteNodeId must reference a STORE_ANCHOR route node",
        );
      }
    }

    if (replacesMapObjects) {
      const detachedMapObjectIds = currentMapObjects
        .map((object) => object.id)
        .filter((id) => !desiredMapObjectIds.has(id));

      await this.clearPrimaryMarkersForDetachedMapObjects(
        tx,
        storeId,
        detachedMapObjectIds,
      );

      await tx.mapObject.updateMany({
        where: {
          storeId,
          id: { notIn: [...desiredMapObjectIds] },
        },
        data: { storeId: null },
      });
    }

    if (desiredMapObjectIds.size > 0) {
      await tx.mapObject.updateMany({
        where: { id: { in: [...desiredMapObjectIds] } },
        data: { storeId },
      });
    }

    if (dto.primaryMapObjectId !== undefined) {
      await this.syncPrimaryMapObject(tx, storeId, dto.primaryMapObjectId);
    }

    if (dto.primaryRouteNodeId !== undefined) {
      await this.syncPrimaryRouteNode(tx, storeId, dto.primaryRouteNodeId);
    }
  }

  private async clearPrimaryMarkersForDetachedMapObjects(
    tx: Prisma.TransactionClient,
    storeId: string,
    mapObjectIds: string[],
  ): Promise<void> {
    if (mapObjectIds.length === 0) {
      return;
    }

    const mapObjects = await tx.mapObject.findMany({
      where: { id: { in: mapObjectIds } },
      select: {
        id: true,
        metadata: true,
        routeNodes: {
          select: { id: true, metadata: true },
        },
      },
    });

    for (const object of mapObjects) {
      const objectMetadata = updatePrimaryStoreRelationMetadata({
        metadata: object.metadata,
        relation: "mapObject",
        storeId,
        isPrimary: false,
      });

      if (objectMetadata !== undefined) {
        await tx.mapObject.update({
          where: { id: object.id },
          data: { metadata: objectMetadata },
        });
      }

      for (const node of object.routeNodes) {
        const nodeMetadata = updatePrimaryStoreRelationMetadata({
          metadata: node.metadata,
          relation: "routeNode",
          storeId,
          isPrimary: false,
        });

        if (nodeMetadata !== undefined) {
          await tx.routeNode.update({
            where: { id: node.id },
            data: { metadata: nodeMetadata },
          });
        }
      }
    }
  }

  private async syncPrimaryMapObject(
    tx: Prisma.TransactionClient,
    storeId: string,
    primaryMapObjectId: string | null,
  ): Promise<void> {
    const mapObjects = await tx.mapObject.findMany({
      where: { storeId },
      select: { id: true, metadata: true },
    });

    if (
      primaryMapObjectId !== null &&
      !mapObjects.some((object) => object.id === primaryMapObjectId)
    ) {
      throw new BadRequestException(
        "primaryMapObjectId must reference a map object linked to the store",
      );
    }

    for (const object of mapObjects) {
      const metadata = updatePrimaryStoreRelationMetadata({
        metadata: object.metadata,
        relation: "mapObject",
        storeId,
        isPrimary: object.id === primaryMapObjectId,
      });

      if (metadata !== undefined) {
        await tx.mapObject.update({
          where: { id: object.id },
          data: { metadata },
        });
      }
    }
  }

  private async syncPrimaryRouteNode(
    tx: Prisma.TransactionClient,
    storeId: string,
    primaryRouteNodeId: string | null,
  ): Promise<void> {
    const routeNodes = await tx.routeNode.findMany({
      where: { mapObject: { storeId } },
      select: { id: true, type: true, metadata: true },
    });

    const primaryRouteNode = routeNodes.find(
      (node) => node.id === primaryRouteNodeId,
    );

    if (primaryRouteNodeId !== null && !primaryRouteNode) {
      throw new BadRequestException(
        "primaryRouteNodeId must reference a route node linked to the store",
      );
    }

    if (
      primaryRouteNode &&
      primaryRouteNode.type !== RouteNodeType.STORE_ANCHOR
    ) {
      throw new BadRequestException(
        "primaryRouteNodeId must reference a STORE_ANCHOR route node",
      );
    }

    for (const node of routeNodes) {
      const metadata = updatePrimaryStoreRelationMetadata({
        metadata: node.metadata,
        relation: "routeNode",
        storeId,
        isPrimary: node.id === primaryRouteNodeId,
      });

      if (metadata !== undefined) {
        await tx.routeNode.update({
          where: { id: node.id },
          data: { metadata },
        });
      }
    }
  }

  private async findAdminStoreOrThrow(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<StoreAdminWithRelations> {
    const store = await tx.store.findUnique({
      where: { id },
      include: storeAdminInclude,
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return store;
  }

  private async resolveSlug(
    slugValue: string | undefined,
    fallback: string,
    currentId?: string,
    explicit = Boolean(slugValue),
  ): Promise<string> {
    const baseSlug = slugify(slugValue || fallback);

    if (explicit) {
      const conflict = await this.prisma.store.findFirst({
        where: {
          slug: baseSlug,
          ...(currentId ? { id: { not: currentId } } : {}),
        },
        select: { id: true },
      });

      if (conflict) {
        throw new ConflictException("Store slug already exists");
      }

      return baseSlug;
    }

    return this.getAvailableSlug(baseSlug);
  }

  private async getAvailableSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let counter = 2;

    while (
      await this.prisma.store.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private getPagination(query: StoreQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private toResponse(store: StoreWithRelations): StoreResponseDto {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      roomNumber: store.roomNumber,
      phone: store.phone,
      email: store.email,
      website: store.website,
      workingHours: store.workingHours,
      searchKeywords: store.searchKeywords,
      logoAssetId: store.logoAssetId,
      coverAssetId: store.coverAssetId,
      isActive: store.isActive,
      isVisible: store.isVisible,
      tenant: store.tenant,
      category: store.category,
      floor: store.floor,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private toAdminResponse(
    store: StoreAdminWithRelations,
  ): StoreAdminResponseDto {
    const routeNodes = store.mapObjects.flatMap((object) => object.routeNodes);
    const primaryRouteNode =
      routeNodes.find((node) =>
        isPrimaryStoreRelation(node.metadata, "routeNode", store.id),
      ) ??
      routeNodes.find((node) => node.type === RouteNodeType.STORE_ANCHOR) ??
      routeNodes[0] ??
      null;
    const primaryMapObject =
      store.mapObjects.find((object) =>
        isPrimaryStoreRelation(object.metadata, "mapObject", store.id),
      ) ??
      store.mapObjects.find((object) =>
        object.routeNodes.some((node) => node.id === primaryRouteNode?.id),
      ) ??
      store.mapObjects[0] ??
      null;

    return {
      ...this.toResponse(store),
      tenantId: store.tenantId,
      categoryId: store.categoryId,
      floorId: store.floorId,
      mapObjectIds: store.mapObjects.map((object) => object.id),
      routeNodeIds: routeNodes.map((node) => node.id),
      primaryMapObjectId: primaryMapObject?.id ?? null,
      primaryRouteNodeId: primaryRouteNode?.id ?? null,
    };
  }

  private toSearchResponse(
    store: StoreSearchWithRelations,
  ): StoreSearchResponseDto {
    const mapObjectIds = store.mapObjects.map((object) => object.id);
    const routeNodes = store.mapObjects.flatMap((object) => object.routeNodes);
    const routeNodeIds = routeNodes.map((node) => node.id);
    const primaryRouteNode =
      routeNodes.find((node) =>
        isPrimaryStoreRelation(node.metadata, "routeNode", store.id),
      ) ??
      routeNodes.find((node) => node.type === RouteNodeType.STORE_ANCHOR) ??
      routeNodes[0] ??
      null;
    const primaryMapObject =
      store.mapObjects.find((object) =>
        isPrimaryStoreRelation(object.metadata, "mapObject", store.id),
      ) ??
      store.mapObjects.find((object) =>
        object.routeNodes.some((node) => node.id === primaryRouteNode?.id),
      ) ??
      store.mapObjects[0] ??
      null;

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      roomNumber: store.roomNumber,
      category: store.category,
      description: store.description,
      primaryMapObjectId: primaryMapObject?.id ?? null,
      mapObjectIds,
      primaryRouteNodeId: primaryRouteNode?.id ?? null,
      routeNodeIds,
      searchKeywords: store.searchKeywords,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Store slug already exists");
    }

    throw error;
  }
}
