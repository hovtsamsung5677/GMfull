import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdCampaign, AdPlacement, AdTargetType, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runSerializableTransaction } from "../../database/serializable-transaction";
import {
  adCampaignAdminInclude,
  toAdCampaignAdminResponse,
} from "./ad-campaign-admin.projection";
import {
  AdCampaignAdminListResponseDto,
  AdCampaignAdminResponseDto,
} from "./dto/ad-campaign-admin-response.dto";
import { AdCampaignQueryDto } from "./dto/ad-campaign-query.dto";
import { CreateAdCampaignDto } from "./dto/create-ad-campaign.dto";
import { UpdateAdCampaignDto } from "./dto/update-ad-campaign.dto";

interface AdCampaignValidationState {
  tenantId: string | null;
  targetType: AdTargetType;
  targetStoreId: string | null;
  targetPromotionId: string | null;
  targetUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  priority: number;
  impressionLimit: number | null;
  isActive: boolean;
}

type AdCampaignWriteClient = Pick<
  Prisma.TransactionClient,
  "adCampaign" | "adCampaignAssignment" | "tenant" | "store" | "promotion"
>;

@Injectable()
export class AdCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AdCampaignQueryDto,
  ): Promise<AdCampaignAdminListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [campaigns, total] = await this.prisma.$transaction([
      this.prisma.adCampaign.findMany({
        where,
        include: adCampaignAdminInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adCampaign.count({ where }),
    ]);

    return {
      items: campaigns.map(toAdCampaignAdminResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AdCampaignAdminResponseDto> {
    const campaign = await this.prisma.adCampaign.findFirst({
      where: { id, deletedAt: null },
      include: adCampaignAdminInclude,
    });

    if (!campaign) {
      throw new NotFoundException("Ad campaign not found");
    }

    return toAdCampaignAdminResponse(campaign);
  }

  async create(
    dto: CreateAdCampaignDto,
    userId: string,
  ): Promise<AdCampaignAdminResponseDto> {
    const state: AdCampaignValidationState = {
      tenantId: dto.tenantId ?? null,
      targetType: dto.targetType ?? AdTargetType.NONE,
      targetStoreId: dto.targetStoreId ?? null,
      targetPromotionId: dto.targetPromotionId ?? null,
      targetUrl: this.normalizeUrl(dto.targetUrl ?? null),
      startsAt: this.parseDate(dto.startsAt),
      endsAt: this.parseDate(dto.endsAt),
      priority: dto.priority ?? 0,
      impressionLimit: dto.impressionLimit ?? null,
      isActive: dto.isActive ?? true,
    };

    await this.validateState(state);

    try {
      const campaign = await this.prisma.adCampaign.create({
        data: {
          name: dto.name.trim(),
          description: dto.description,
          tenantId: state.tenantId,
          placement: dto.placement,
          targetType: state.targetType,
          targetStoreId: state.targetStoreId,
          targetPromotionId: state.targetPromotionId,
          targetUrl: state.targetUrl,
          startsAt: state.startsAt,
          endsAt: state.endsAt,
          priority: state.priority,
          impressionLimit: state.impressionLimit,
          isActive: state.isActive,
          metadata: this.toJsonInput(dto.metadata),
          createdById: userId,
          updatedById: userId,
        },
        include: adCampaignAdminInclude,
      });

      return toAdCampaignAdminResponse(campaign);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateAdCampaignDto,
    userId: string,
  ): Promise<AdCampaignAdminResponseDto> {
    const existing = await this.findExisting(id);
    const placementChanges =
      dto.placement !== undefined && dto.placement !== existing.placement;

    try {
      if (placementChanges) {
        return await runSerializableTransaction(this.prisma, async (tx) => {
          const current = await this.findExisting(id, tx);
          const currentPlacementChanges =
            dto.placement !== undefined && dto.placement !== current.placement;

          if (currentPlacementChanges) {
            await this.ensurePlacementCompatibleWithAssignments(
              tx,
              id,
              dto.placement!,
            );
          }

          return this.updateRecord(
            tx,
            current,
            dto,
            userId,
            currentPlacementChanges,
          );
        });
      }

      return await this.updateRecord(this.prisma, existing, dto, userId, false);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<AdCampaignAdminResponseDto> {
    const result = await this.prisma.adCampaign.updateMany({
      where: { id, deletedAt: null },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Ad campaign not found");
    }

    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: adCampaignAdminInclude,
    });

    if (!campaign) {
      throw new NotFoundException("Ad campaign not found");
    }

    return toAdCampaignAdminResponse(campaign);
  }

  private buildWhere(query: AdCampaignQueryDto): Prisma.AdCampaignWhereInput {
    const search = query.search?.trim();
    const startsFrom = this.parseDate(query.startsFrom);
    const startsTo = this.parseDate(query.startsTo);

    if (
      startsFrom !== null &&
      startsTo !== null &&
      startsFrom.getTime() > startsTo.getTime()
    ) {
      throw new BadRequestException(
        "startsFrom must be earlier than or equal to startsTo",
      );
    }

    return {
      deletedAt: null,
      tenantId: query.tenantId,
      placement: query.placement,
      targetType: query.targetType,
      isActive: query.isActive,
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(startsFrom !== null || startsTo !== null
        ? {
            startsAt: {
              ...(startsFrom !== null ? { gte: startsFrom } : {}),
              ...(startsTo !== null ? { lte: startsTo } : {}),
            },
          }
        : {}),
    };
  }

  private async findExisting(
    id: string,
    db: AdCampaignWriteClient = this.prisma,
  ) {
    const campaign = await db.adCampaign.findFirst({
      where: { id, deletedAt: null },
    });

    if (!campaign) {
      throw new NotFoundException("Ad campaign not found");
    }

    return campaign;
  }

  private async ensurePlacementCompatibleWithAssignments(
    db: AdCampaignWriteClient,
    campaignId: string,
    placement: AdPlacement,
  ): Promise<void> {
    const conflict = await db.adCampaignAssignment.findFirst({
      where: {
        campaignId,
        deletedAt: null,
        slot: { is: { placement: { not: placement } } },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        "Ad campaign placement conflicts with an assigned ad slot",
      );
    }
  }

  private async updateRecord(
    db: AdCampaignWriteClient,
    existing: AdCampaign,
    dto: UpdateAdCampaignDto,
    userId: string,
    writePlacement: boolean,
  ): Promise<AdCampaignAdminResponseDto> {
    const state: AdCampaignValidationState = {
      tenantId: dto.tenantId === undefined ? existing.tenantId : dto.tenantId,
      targetType: dto.targetType ?? existing.targetType,
      targetStoreId:
        dto.targetStoreId === undefined
          ? existing.targetStoreId
          : dto.targetStoreId,
      targetPromotionId:
        dto.targetPromotionId === undefined
          ? existing.targetPromotionId
          : dto.targetPromotionId,
      targetUrl:
        dto.targetUrl === undefined
          ? existing.targetUrl
          : this.normalizeUrl(dto.targetUrl),
      startsAt:
        dto.startsAt === undefined
          ? existing.startsAt
          : this.parseDate(dto.startsAt),
      endsAt:
        dto.endsAt === undefined ? existing.endsAt : this.parseDate(dto.endsAt),
      priority: dto.priority ?? existing.priority,
      impressionLimit:
        dto.impressionLimit === undefined
          ? existing.impressionLimit
          : dto.impressionLimit,
      isActive: dto.isActive ?? existing.isActive,
    };

    await this.validateState(state, db);

    const campaign = await db.adCampaign.update({
      where: { id: existing.id, deletedAt: null },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        description: dto.description,
        tenantId: state.tenantId,
        placement: writePlacement ? dto.placement : undefined,
        targetType: state.targetType,
        targetStoreId: state.targetStoreId,
        targetPromotionId: state.targetPromotionId,
        targetUrl: state.targetUrl,
        startsAt: state.startsAt,
        endsAt: state.endsAt,
        priority: state.priority,
        impressionLimit: state.impressionLimit,
        isActive: state.isActive,
        metadata: this.toJsonInput(dto.metadata),
        updatedById: userId,
      },
      include: adCampaignAdminInclude,
    });

    return toAdCampaignAdminResponse(campaign);
  }

  private async validateState(
    state: AdCampaignValidationState,
    db: AdCampaignWriteClient = this.prisma,
  ) {
    this.validateDateRange(state.startsAt, state.endsAt);
    this.validateLimits(state.priority, state.impressionLimit);
    this.validateTargetShape(state);

    if (state.tenantId !== null) {
      const tenant = await db.tenant.findUnique({
        where: { id: state.tenantId },
        select: { id: true, isActive: true },
      });

      if (!tenant) {
        throw new NotFoundException("Tenant not found");
      }

      if (state.isActive && !tenant.isActive) {
        throw new ConflictException(
          "Active ad campaign requires an active tenant",
        );
      }
    }

    if (state.targetType === AdTargetType.STORE) {
      await this.validateStoreTarget(state, db);
    }

    if (state.targetType === AdTargetType.PROMOTION) {
      await this.validatePromotionTarget(state, db);
    }

    if (state.targetType === AdTargetType.URL) {
      this.validateHttpUrl(state.targetUrl!);
    }
  }

  private validateTargetShape(state: AdCampaignValidationState): void {
    const hasStore = state.targetStoreId !== null;
    const hasPromotion = state.targetPromotionId !== null;
    const hasUrl = state.targetUrl !== null;

    if (state.targetType === AdTargetType.STORE) {
      if (!hasStore || hasPromotion || hasUrl) {
        throw new BadRequestException(
          "STORE target requires only targetStoreId",
        );
      }

      if (state.tenantId === null) {
        throw new BadRequestException(
          "STORE target requires campaign tenantId",
        );
      }

      return;
    }

    if (state.targetType === AdTargetType.PROMOTION) {
      if (hasStore || !hasPromotion || hasUrl) {
        throw new BadRequestException(
          "PROMOTION target requires only targetPromotionId",
        );
      }

      return;
    }

    if (state.targetType === AdTargetType.URL) {
      if (hasStore || hasPromotion || !hasUrl) {
        throw new BadRequestException("URL target requires only targetUrl");
      }

      return;
    }

    if (hasStore || hasPromotion || hasUrl) {
      throw new BadRequestException("NONE target cannot contain target fields");
    }
  }

  private async validateStoreTarget(
    state: AdCampaignValidationState,
    db: AdCampaignWriteClient,
  ): Promise<void> {
    const store = await db.store.findUnique({
      where: { id: state.targetStoreId! },
      select: {
        id: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!store) {
      throw new NotFoundException("Target store not found");
    }

    if (store.tenantId !== state.tenantId) {
      throw new ConflictException(
        "Target store tenant does not match campaign tenant",
      );
    }

    if (state.isActive && !store.isActive) {
      throw new ConflictException(
        "Active ad campaign requires an active target store",
      );
    }
  }

  private async validatePromotionTarget(
    state: AdCampaignValidationState,
    db: AdCampaignWriteClient,
  ): Promise<void> {
    const promotion = await db.promotion.findFirst({
      where: {
        id: state.targetPromotionId!,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        storeId: true,
        isActive: true,
        tenant: {
          select: {
            id: true,
            isActive: true,
          },
        },
        store: {
          select: {
            id: true,
            tenantId: true,
            isActive: true,
            isVisible: true,
          },
        },
      },
    });

    if (!promotion) {
      throw new NotFoundException("Target promotion not found");
    }

    if (promotion.tenantId !== state.tenantId) {
      throw new ConflictException(
        "Target promotion tenant does not match campaign tenant",
      );
    }

    if (!state.isActive) {
      return;
    }

    const hasAvailablePromotionRelations =
      promotion.isActive &&
      promotion.tenantId !== null &&
      promotion.storeId !== null &&
      promotion.tenant !== null &&
      promotion.tenant.isActive &&
      promotion.store !== null &&
      promotion.store.isActive &&
      promotion.store.isVisible &&
      promotion.store.tenantId === promotion.tenantId;

    if (!hasAvailablePromotionRelations) {
      throw new ConflictException(
        "Active ad campaign requires an active promotion with an active tenant and an active visible store",
      );
    }
  }

  private validateDateRange(startsAt: Date | null, endsAt: Date | null): void {
    if (startsAt !== null && endsAt !== null && startsAt >= endsAt) {
      throw new BadRequestException("startsAt must be earlier than endsAt");
    }
  }

  private validateLimits(
    priority: number,
    impressionLimit: number | null,
  ): void {
    if (!Number.isInteger(priority) || priority < 0 || priority > 1_000_000) {
      throw new BadRequestException(
        "priority must be an integer between 0 and 1000000",
      );
    }

    if (
      impressionLimit !== null &&
      (!Number.isInteger(impressionLimit) ||
        impressionLimit <= 0 ||
        impressionLimit > 2_147_483_647)
    ) {
      throw new BadRequestException(
        "impressionLimit must be a positive 32-bit integer",
      );
    }
  }

  private validateHttpUrl(value: string): void {
    try {
      const url = new URL(value);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new BadRequestException(
        "targetUrl must be an absolute HTTP or HTTPS URL",
      );
    }
  }

  private normalizeUrl(value: string | null): string | null {
    return value === null ? null : value.trim();
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Invalid ISO 8601 date");
    }

    return date;
  }

  private toJsonInput(
    value: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new BadRequestException(
          "A referenced ad campaign entity no longer exists",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Ad campaign not found");
      }

      if (error.code === "P2004") {
        throw new BadRequestException(
          "Ad campaign violates a database constraint",
        );
      }
    }

    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("23514") ||
      message.includes("AdCampaign_valid_date_range") ||
      message.includes("AdCampaign_positive_impression_limit") ||
      message.includes("AdCampaign_valid_target")
    ) {
      throw new BadRequestException(
        "Ad campaign violates a database constraint",
      );
    }

    throw error;
  }
}
