import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FileAssetKind, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  adCreativeAdminInclude,
  toAdCreativeAdminResponse,
} from "./ad-creative-admin.projection";
import {
  AdCreativeAdminListResponseDto,
  AdCreativeAdminResponseDto,
} from "./dto/ad-creative-admin-response.dto";
import { AdCreativeQueryDto } from "./dto/ad-creative-query.dto";
import { CreateAdCreativeDto } from "./dto/create-ad-creative.dto";
import { UpdateAdCreativeDto } from "./dto/update-ad-creative.dto";

interface AdCreativeValidationState {
  assetId: string | null;
  isActive: boolean;
  sortOrder: number;
}

@Injectable()
export class AdCreativesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    campaignId: string,
    query: AdCreativeQueryDto,
  ): Promise<AdCreativeAdminListResponseDto> {
    await this.ensureCampaignAvailable(campaignId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(campaignId, query);

    const [creatives, total] = await this.prisma.$transaction([
      this.prisma.adCreative.findMany({
        where,
        include: adCreativeAdminInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adCreative.count({ where }),
    ]);

    return {
      items: creatives.map(toAdCreativeAdminResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AdCreativeAdminResponseDto> {
    const creative = await this.prisma.adCreative.findFirst({
      where: {
        id,
        deletedAt: null,
        campaign: {
          is: {
            deletedAt: null,
          },
        },
      },
      include: adCreativeAdminInclude,
    });

    if (!creative) {
      throw new NotFoundException("Ad creative not found");
    }

    return toAdCreativeAdminResponse(creative);
  }

  async create(
    campaignId: string,
    dto: CreateAdCreativeDto,
    userId: string,
  ): Promise<AdCreativeAdminResponseDto> {
    await this.ensureCampaignAvailable(campaignId);

    const state: AdCreativeValidationState = {
      assetId: dto.assetId ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };

    await this.validateState(state);

    try {
      const creative = await this.prisma.adCreative.create({
        data: {
          campaignId,
          assetId: state.assetId,
          title: this.normalizeNullableText(dto.title),
          description: this.normalizeNullableText(dto.description),
          altText: this.normalizeNullableText(dto.altText),
          ctaText: this.normalizeNullableText(dto.ctaText),
          isActive: state.isActive,
          sortOrder: state.sortOrder,
          metadata: this.toJsonInput(dto.metadata),
          createdById: userId,
          updatedById: userId,
        },
        include: adCreativeAdminInclude,
      });

      return toAdCreativeAdminResponse(creative);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateAdCreativeDto,
    userId: string,
  ): Promise<AdCreativeAdminResponseDto> {
    const existing = await this.findExisting(id);
    const state: AdCreativeValidationState = {
      assetId: dto.assetId === undefined ? existing.assetId : dto.assetId,
      isActive: dto.isActive ?? existing.isActive,
      sortOrder: dto.sortOrder ?? existing.sortOrder,
    };

    await this.validateState(state);

    try {
      const creative = await this.prisma.adCreative.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          assetId: state.assetId,
          title: this.normalizeNullableText(dto.title),
          description: this.normalizeNullableText(dto.description),
          altText: this.normalizeNullableText(dto.altText),
          ctaText: this.normalizeNullableText(dto.ctaText),
          isActive: state.isActive,
          sortOrder: state.sortOrder,
          metadata: this.toJsonInput(dto.metadata),
          updatedById: userId,
        },
        include: adCreativeAdminInclude,
      });

      return toAdCreativeAdminResponse(creative);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<AdCreativeAdminResponseDto> {
    const result = await this.prisma.adCreative.updateMany({
      where: {
        id,
        deletedAt: null,
        campaign: {
          is: {
            deletedAt: null,
          },
        },
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Ad creative not found");
    }

    const creative = await this.prisma.adCreative.findUnique({
      where: { id },
      include: adCreativeAdminInclude,
    });

    if (!creative) {
      throw new NotFoundException("Ad creative not found");
    }

    return toAdCreativeAdminResponse(creative);
  }

  private buildWhere(
    campaignId: string,
    query: AdCreativeQueryDto,
  ): Prisma.AdCreativeWhereInput {
    const search = query.search?.trim();

    return {
      campaignId,
      deletedAt: null,
      isActive: query.isActive,
      assetId: query.assetId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              { altText: { contains: search, mode: "insensitive" as const } },
              { ctaText: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
  }

  private async ensureCampaignAvailable(campaignId: string): Promise<void> {
    const campaign = await this.prisma.adCampaign.findFirst({
      where: {
        id: campaignId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundException("Ad campaign not found");
    }
  }

  private async findExisting(id: string) {
    const creative = await this.prisma.adCreative.findFirst({
      where: {
        id,
        deletedAt: null,
        campaign: {
          is: {
            deletedAt: null,
          },
        },
      },
    });

    if (!creative) {
      throw new NotFoundException("Ad creative not found");
    }

    return creative;
  }

  private async validateState(state: AdCreativeValidationState): Promise<void> {
    if (
      !Number.isInteger(state.sortOrder) ||
      state.sortOrder < 0 ||
      state.sortOrder > 1_000_000
    ) {
      throw new BadRequestException(
        "sortOrder must be an integer between 0 and 1000000",
      );
    }

    if (state.assetId === null) {
      if (state.isActive) {
        throw new BadRequestException(
          "Active ad creative requires a file asset",
        );
      }

      return;
    }

    const asset = await this.prisma.fileAsset.findUnique({
      where: { id: state.assetId },
      select: {
        id: true,
        kind: true,
        isActive: true,
      },
    });

    if (!asset) {
      throw new NotFoundException("File asset not found");
    }

    if (asset.kind !== FileAssetKind.IMAGE) {
      throw new BadRequestException(
        "Ad creative file asset must have kind IMAGE",
      );
    }

    if (state.isActive && !asset.isActive) {
      throw new ConflictException(
        "Active ad creative requires an active file asset",
      );
    }
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
      if (error.code === "P2003") {
        throw new NotFoundException(
          "Referenced ad campaign or file asset not found",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Ad creative not found");
      }
    }

    throw error;
  }
}
