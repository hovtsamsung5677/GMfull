import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FileAssetKind, Prisma } from "@prisma/client";
import { slugify } from "../../common/utils/slugify.util";
import { PrismaService } from "../../database/prisma.service";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { PromotionAdminResponseDto } from "./dto/promotion-admin-response.dto";
import { PromotionQueryDto } from "./dto/promotion-query.dto";
import { PublicPromotionQueryDto } from "./dto/public-promotion-query.dto";
import { PublicPromotionResponseDto } from "./dto/public-promotion-response.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import {
  buildPublicPromotionWhere,
  hasConsistentPublicPromotionTenant,
} from "./promotion-public.eligibility";
import {
  publicPromotionSelect,
  toPublicPromotionResponse,
} from "./promotion-public.projection";

const promotionAdminInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      tenantId: true,
      isActive: true,
      isVisible: true,
    },
  },
  imageAsset: {
    select: {
      id: true,
      filename: true,
      originalName: true,
      url: true,
      mimeType: true,
      kind: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} satisfies Prisma.PromotionInclude;

interface PromotionReferenceInput {
  storeId: string | null;
  tenantId: string | null;
  imageAssetId: string | null;
  isActive: boolean;
  deriveTenantFromStore: boolean;
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(
    query: PublicPromotionQueryDto,
  ): Promise<PublicPromotionResponseDto[]> {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: buildPublicPromotionWhere(now, query.storeId),
      select: publicPromotionSelect,
      orderBy: [
        { sortOrder: "asc" },
        { startsAt: "desc" },
        { createdAt: "desc" },
        { id: "asc" },
      ],
      ...this.getPagination(query),
    });

    return promotions
      .filter(hasConsistentPublicPromotionTenant)
      .map(toPublicPromotionResponse);
  }

  async findPublicOne(slug: string): Promise<PublicPromotionResponseDto> {
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        ...buildPublicPromotionWhere(new Date()),
        slug,
      },
      select: publicPromotionSelect,
    });

    if (!promotion || !hasConsistentPublicPromotionTenant(promotion)) {
      throw new NotFoundException("Promotion not found");
    }

    return toPublicPromotionResponse(promotion);
  }

  async findAll(
    query: PromotionQueryDto,
  ): Promise<PromotionAdminResponseDto[]> {
    return this.prisma.promotion.findMany({
      where: this.buildWhere(query),
      include: promotionAdminInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      ...this.getPagination(query),
    });
  }

  async findOne(id: string): Promise<PromotionAdminResponseDto> {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, deletedAt: null },
      include: promotionAdminInclude,
    });

    if (!promotion) {
      throw new NotFoundException("Promotion not found");
    }

    return promotion;
  }

  async create(
    dto: CreatePromotionDto,
    userId: string,
  ): Promise<PromotionAdminResponseDto> {
    const slug = slugify(dto.slug);
    await this.ensureSlugAvailable(slug);

    const startsAt = this.parseDate(dto.startsAt);
    const endsAt = this.parseDate(dto.endsAt);
    this.ensureValidDateRange(startsAt as Date, endsAt as Date);

    const storeId = dto.storeId ?? null;
    const tenantId = await this.ensureReferencesValid({
      storeId,
      tenantId: dto.tenantId ?? null,
      imageAssetId: dto.imageAssetId ?? null,
      isActive: dto.isActive ?? true,
      deriveTenantFromStore: storeId !== null && dto.tenantId === undefined,
    });

    try {
      return await this.prisma.promotion.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          terms: dto.terms,
          buttonText: dto.buttonText,
          buttonUrl: dto.buttonUrl,
          tenantId,
          storeId,
          imageAssetId: dto.imageAssetId ?? null,
          startsAt,
          endsAt,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
          metadata:
            dto.metadata === null
              ? Prisma.DbNull
              : (dto.metadata as Prisma.InputJsonValue | undefined),
          createdById: userId,
          updatedById: userId,
        },
        include: promotionAdminInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePromotionDto,
    userId: string,
  ): Promise<PromotionAdminResponseDto> {
    const existing = await this.findExisting(id);
    const slug = dto.slug === undefined ? undefined : slugify(dto.slug);

    if (slug !== undefined) {
      await this.ensureSlugAvailable(slug, id);
    }

    const startsAt =
      dto.startsAt === undefined
        ? existing.startsAt
        : this.parseDate(dto.startsAt);
    const endsAt =
      dto.endsAt === undefined ? existing.endsAt : this.parseDate(dto.endsAt);
    this.ensureValidDateRange(startsAt as Date, endsAt as Date);

    const storeId = dto.storeId === undefined ? existing.storeId : dto.storeId;
    const requestedTenantId =
      dto.tenantId === undefined ? existing.tenantId : dto.tenantId;
    const imageAssetId =
      dto.imageAssetId === undefined ? existing.imageAssetId : dto.imageAssetId;
    const isActive = dto.isActive ?? existing.isActive;

    const tenantId = await this.ensureReferencesValid({
      storeId,
      tenantId: requestedTenantId,
      imageAssetId,
      isActive,
      deriveTenantFromStore:
        dto.storeId !== undefined &&
        dto.storeId !== null &&
        dto.tenantId === undefined,
    });

    try {
      return await this.prisma.promotion.update({
        where: { id },
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          terms: dto.terms,
          buttonText: dto.buttonText,
          buttonUrl: dto.buttonUrl,
          tenantId,
          storeId,
          imageAssetId,
          startsAt,
          endsAt,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
          metadata:
            dto.metadata === null
              ? Prisma.DbNull
              : (dto.metadata as Prisma.InputJsonValue | undefined),
          updatedById: userId,
        },
        include: promotionAdminInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, userId: string): Promise<PromotionAdminResponseDto> {
    const result = await this.prisma.promotion.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Promotion not found");
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: promotionAdminInclude,
    });

    if (!promotion) {
      throw new NotFoundException("Promotion not found");
    }

    return promotion;
  }

  private buildWhere(query: PromotionQueryDto): Prisma.PromotionWhereInput {
    const search = query.search?.trim();

    return {
      deletedAt: null,
      storeId: query.storeId,
      tenantId: query.tenantId,
      isActive: query.isActive,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };
  }

  private getPagination(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private async findExisting(id: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, deletedAt: null },
    });

    if (!promotion) {
      throw new NotFoundException("Promotion not found");
    }

    return promotion;
  }

  private async ensureSlugAvailable(
    slug: string,
    currentId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.promotion.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException("Promotion slug already exists");
    }
  }

  private async ensureReferencesValid(
    input: PromotionReferenceInput,
  ): Promise<string | null> {
    let tenantId = input.tenantId;

    if (input.isActive && input.storeId === null) {
      throw new BadRequestException("Active promotion requires storeId");
    }

    if (input.isActive && input.tenantId === null) {
      throw new BadRequestException("Active promotion requires tenantId");
    }

    if (input.storeId !== null) {
      const store = await this.prisma.store.findUnique({
        where: { id: input.storeId },
        select: {
          id: true,
          tenantId: true,
          isActive: true,
          isVisible: true,
        },
      });

      if (!store) {
        throw new NotFoundException("Store not found");
      }

      if (input.deriveTenantFromStore) {
        tenantId = store.tenantId;
      } else if (tenantId !== store.tenantId) {
        throw new BadRequestException(
          "tenantId must match the tenantId of the selected store",
        );
      }

      if (input.isActive && (!store.isActive || !store.isVisible)) {
        throw new BadRequestException(
          "Active promotion requires an active and visible store",
        );
      }
    }

    if (tenantId !== null) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, isActive: true },
      });

      if (!tenant) {
        throw new NotFoundException("Tenant not found");
      }

      if (input.isActive && !tenant.isActive) {
        throw new BadRequestException(
          "Active promotion requires an active tenant",
        );
      }
    }

    if (input.imageAssetId !== null) {
      const asset = await this.prisma.fileAsset.findUnique({
        where: { id: input.imageAssetId },
        select: { id: true, isActive: true, kind: true },
      });

      if (!asset) {
        throw new NotFoundException("Image asset not found");
      }

      if (!asset.isActive) {
        throw new BadRequestException("Image asset must be active");
      }

      if (asset.kind !== FileAssetKind.IMAGE) {
        throw new BadRequestException("Image asset must have kind IMAGE");
      }
    }

    return tenantId;
  }

  private parseDate(value: string | null | undefined) {
    if (value === undefined || value === null) {
      return value;
    }

    return new Date(value);
  }

  private ensureValidDateRange(
    startsAt: Date | null | undefined,
    endsAt: Date | null | undefined,
  ): void {
    if (startsAt && endsAt && startsAt.getTime() >= endsAt.getTime()) {
      throw new BadRequestException("startsAt must be earlier than endsAt");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("Promotion slug already exists");
      }

      if (error.code === "P2003") {
        throw new BadRequestException(
          "A referenced promotion entity no longer exists",
        );
      }

      if (error.code === "P2004") {
        throw new BadRequestException("Invalid promotion date range");
      }
    }

    throw error;
  }
}
