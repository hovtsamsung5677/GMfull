import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdPlacement, AdSlot, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runSerializableTransaction } from "../../database/serializable-transaction";
import { normalizeAdSlotCode } from "./ad-slot-code";
import {
  adSlotAdminInclude,
  toAdSlotAdminResponse,
} from "./ad-slot-admin.projection";
import {
  AdSlotAdminListResponseDto,
  AdSlotAdminResponseDto,
} from "./dto/ad-slot-admin-response.dto";
import { AdSlotQueryDto } from "./dto/ad-slot-query.dto";
import { CreateAdSlotDto } from "./dto/create-ad-slot.dto";
import { UpdateAdSlotDto } from "./dto/update-ad-slot.dto";

interface AdSlotValidationState {
  code: string;
  name: string;
  description: string | null;
  placement: AdPlacement;
  panelId: string | null;
  sortOrder: number;
  isActive: boolean;
}

type AdSlotWriteClient = Pick<
  Prisma.TransactionClient,
  "adSlot" | "adCampaignAssignment" | "panel"
>;

@Injectable()
export class AdSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdSlotQueryDto): Promise<AdSlotAdminListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [slots, total] = await this.prisma.$transaction([
      this.prisma.adSlot.findMany({
        where,
        include: adSlotAdminInclude,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adSlot.count({ where }),
    ]);

    return {
      items: slots.map(toAdSlotAdminResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AdSlotAdminResponseDto> {
    const slot = await this.prisma.adSlot.findFirst({
      where: { id, deletedAt: null },
      include: adSlotAdminInclude,
    });

    if (!slot) {
      throw new NotFoundException("Ad slot not found");
    }

    return toAdSlotAdminResponse(slot);
  }

  async create(
    dto: CreateAdSlotDto,
    userId: string,
  ): Promise<AdSlotAdminResponseDto> {
    const state: AdSlotValidationState = {
      code: normalizeAdSlotCode(dto.code),
      name: this.normalizeName(dto.name),
      description: this.normalizeNullableText(dto.description) ?? null,
      placement: dto.placement,
      panelId: dto.panelId ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    };

    await this.validateState(state);
    await this.ensureCodeAvailable(state.code);

    try {
      const slot = await this.prisma.adSlot.create({
        data: {
          ...state,
          metadata: this.toJsonInput(dto.metadata),
          createdById: userId,
          updatedById: userId,
        },
        include: adSlotAdminInclude,
      });

      return toAdSlotAdminResponse(slot);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateAdSlotDto,
    userId: string,
  ): Promise<AdSlotAdminResponseDto> {
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

  async remove(id: string, userId: string): Promise<AdSlotAdminResponseDto> {
    const result = await this.prisma.adSlot.updateMany({
      where: { id, deletedAt: null },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Ad slot not found");
    }

    const slot = await this.prisma.adSlot.findUnique({
      where: { id },
      include: adSlotAdminInclude,
    });

    if (!slot) {
      throw new NotFoundException("Ad slot not found");
    }

    return toAdSlotAdminResponse(slot);
  }

  private buildWhere(query: AdSlotQueryDto): Prisma.AdSlotWhereInput {
    const search = query.search?.trim();

    return {
      deletedAt: null,
      placement: query.placement,
      panelId: query.panelId,
      isActive: query.isActive,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
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

  private async findExisting(id: string, db: AdSlotWriteClient = this.prisma) {
    const slot = await db.adSlot.findFirst({
      where: { id, deletedAt: null },
    });

    if (!slot) {
      throw new NotFoundException("Ad slot not found");
    }

    return slot;
  }

  private async ensurePlacementCompatibleWithAssignments(
    db: AdSlotWriteClient,
    slotId: string,
    placement: AdPlacement,
  ): Promise<void> {
    const conflict = await db.adCampaignAssignment.findFirst({
      where: {
        slotId,
        deletedAt: null,
        campaign: { is: { placement: { not: placement } } },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        "Ad slot placement conflicts with an assigned ad campaign",
      );
    }
  }

  private async updateRecord(
    db: AdSlotWriteClient,
    existing: AdSlot,
    dto: UpdateAdSlotDto,
    userId: string,
    writePlacement: boolean,
  ): Promise<AdSlotAdminResponseDto> {
    const state: AdSlotValidationState = {
      code:
        dto.code === undefined ? existing.code : normalizeAdSlotCode(dto.code),
      name:
        dto.name === undefined ? existing.name : this.normalizeName(dto.name),
      description:
        dto.description === undefined
          ? existing.description
          : (this.normalizeNullableText(dto.description) ?? null),
      placement: dto.placement ?? existing.placement,
      panelId: dto.panelId === undefined ? existing.panelId : dto.panelId,
      sortOrder: dto.sortOrder ?? existing.sortOrder,
      isActive: dto.isActive ?? existing.isActive,
    };

    await this.validateState(state, db);
    await this.ensureCodeAvailable(state.code, existing.id, db);

    const slot = await db.adSlot.update({
      where: { id: existing.id, deletedAt: null },
      data: {
        ...state,
        placement: writePlacement ? state.placement : undefined,
        metadata: this.toJsonInput(dto.metadata),
        updatedById: userId,
      },
      include: adSlotAdminInclude,
    });

    return toAdSlotAdminResponse(slot);
  }

  private async validateState(
    state: AdSlotValidationState,
    db: AdSlotWriteClient = this.prisma,
  ): Promise<void> {
    if (
      state.code.length === 0 ||
      state.code.length > 100 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.code)
    ) {
      throw new BadRequestException(
        "code must be lowercase kebab-case using letters, digits and hyphens",
      );
    }

    if (
      state.name.length === 0 ||
      state.name.length > 200 ||
      !/\S/.test(state.name)
    ) {
      throw new BadRequestException(
        "name must contain between 1 and 200 non-whitespace characters",
      );
    }

    if (state.description !== null && state.description.length > 5000) {
      throw new BadRequestException(
        "description must not exceed 5000 characters",
      );
    }

    if (
      !Number.isInteger(state.sortOrder) ||
      state.sortOrder < 0 ||
      state.sortOrder > 1_000_000
    ) {
      throw new BadRequestException(
        "sortOrder must be an integer between 0 and 1000000",
      );
    }

    if (state.panelId !== null) {
      const panel = await db.panel.findUnique({
        where: { id: state.panelId },
        select: { id: true },
      });

      if (!panel) {
        throw new NotFoundException("Panel not found");
      }
    }
  }

  private async ensureCodeAvailable(
    code: string,
    currentId?: string,
    db: AdSlotWriteClient = this.prisma,
  ): Promise<void> {
    const existing = await db.adSlot.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Ad slot code already exists");
    }
  }

  private normalizeName(value: string): string {
    return value.trim();
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined || value === null) {
      return value;
    }

    return value.trim();
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
      if (error.code === "P2002") {
        throw new ConflictException("Ad slot code already exists");
      }

      if (error.code === "P2003") {
        throw new NotFoundException("Panel not found");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Ad slot not found");
      }
    }

    throw error;
  }
}
