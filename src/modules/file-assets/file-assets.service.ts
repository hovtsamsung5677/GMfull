import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FileAssetKind, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateFileAssetDto } from "./dto/create-file-asset.dto";
import { FileAssetQueryDto } from "./dto/file-asset-query.dto";
import { FileAssetResponseDto } from "./dto/file-asset-response.dto";
import { PublicFileAssetResponseDto } from "./dto/public-file-asset-response.dto";
import { UpdateFileAssetDto } from "./dto/update-file-asset.dto";
import {
  publicFileAssetSelect,
  toPublicFileAssetResponse,
} from "./public-file-asset.projection";

const buildFileAssetWithActiveUsage = (now: Date) =>
  ({
    _count: {
      select: {
        floorMaps: { where: { isActive: true } },
        floorModels: { where: { isActive: true } },
        storeLogos: { where: { isActive: true } },
        storeCovers: { where: { isActive: true } },
        tenantLogos: { where: { isActive: true } },
        adCreativeAssets: { where: { isActive: true } },
      },
    },
    promotionImages: {
      where: {
        isActive: true,
        deletedAt: null,
        storeId: { not: null },
        tenantId: { not: null },
        store: {
          is: {
            isActive: true,
          },
        },
        tenant: {
          is: {
            isActive: true,
          },
        },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: {
        tenantId: true,
        store: {
          select: {
            tenantId: true,
          },
        },
      },
    },
  }) satisfies Prisma.FileAssetInclude;

type FileAssetWithActiveUsage = Prisma.FileAssetGetPayload<{
  include: ReturnType<typeof buildFileAssetWithActiveUsage>;
}>;

@Injectable()
export class FileAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FileAssetQueryDto): Promise<FileAssetResponseDto[]> {
    const assets = await this.prisma.fileAsset.findMany({
      where: this.buildWhere(query),
      include: buildFileAssetWithActiveUsage(new Date()),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...this.getPagination(query),
    });

    return assets.map((asset) => this.toResponse(asset));
  }

  async findOne(id: string): Promise<FileAssetResponseDto> {
    return this.toResponse(await this.findOneOrThrow(id));
  }

  async findPublicOne(id: string): Promise<PublicFileAssetResponseDto> {
    const asset = await this.prisma.fileAsset.findUnique({
      where: { id },
      select: publicFileAssetSelect,
    });

    if (!asset || !asset.isActive) {
      throw new NotFoundException("File asset not found");
    }

    return toPublicFileAssetResponse(asset);
  }

  async create(
    dto: CreateFileAssetDto,
    uploadedById: string | null,
  ): Promise<FileAssetResponseDto> {
    const asset = await this.prisma.fileAsset.create({
      data: {
        filename: dto.filename,
        url: dto.url,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        size: dto.size,
        path: dto.path,
        provider: dto.provider,
        kind: dto.kind ?? FileAssetKind.OTHER,
        metadata:
          dto.metadata === null
            ? Prisma.DbNull
            : (dto.metadata as Prisma.InputJsonValue | undefined),
        uploadedById,
      },
      include: buildFileAssetWithActiveUsage(new Date()),
    });

    return this.toResponse(asset);
  }

  async update(
    id: string,
    dto: UpdateFileAssetDto,
  ): Promise<FileAssetResponseDto> {
    const existing = await this.findOneOrThrow(id);

    if (dto.isActive === false) {
      this.ensureCanDeactivate(existing);
    }

    const asset = await this.prisma.fileAsset.update({
      where: { id },
      data: {
        filename: dto.filename,
        url: dto.url,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        size: dto.size,
        path: dto.path,
        provider: dto.provider,
        kind: dto.kind,
        metadata:
          dto.metadata === null
            ? Prisma.DbNull
            : (dto.metadata as Prisma.InputJsonValue | undefined),
        isActive: dto.isActive,
      },
      include: buildFileAssetWithActiveUsage(new Date()),
    });

    return this.toResponse(asset);
  }

  async remove(id: string): Promise<FileAssetResponseDto> {
    const asset = await this.findOneOrThrow(id);
    this.ensureCanDeactivate(asset);

    const deactivated = await this.prisma.fileAsset.update({
      where: { id },
      data: { isActive: false },
      include: buildFileAssetWithActiveUsage(new Date()),
    });

    return this.toResponse(deactivated);
  }

  private async findOneOrThrow(id: string): Promise<FileAssetWithActiveUsage> {
    const asset = await this.prisma.fileAsset.findUnique({
      where: { id },
      include: buildFileAssetWithActiveUsage(new Date()),
    });

    if (!asset) {
      throw new NotFoundException("File asset not found");
    }

    return asset;
  }

  private buildWhere(query: FileAssetQueryDto): Prisma.FileAssetWhereInput {
    const search = query.search?.trim();

    return {
      ...(search
        ? {
            OR: [
              { filename: { contains: search, mode: "insensitive" as const } },
              {
                originalName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              { url: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.mimeType
        ? {
            mimeType: {
              contains: query.mimeType,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(query.provider
        ? {
            provider: {
              equals: query.provider,
              mode: "insensitive" as const,
            },
          }
        : {}),
      kind: query.kind,
      uploadedById: query.uploadedById,
      isActive: query.isActive,
    };
  }

  private getPagination(query: FileAssetQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private getActiveUsageCount(asset: FileAssetWithActiveUsage): number {
    return (
      asset._count.floorMaps +
      asset._count.floorModels +
      asset._count.storeLogos +
      asset._count.storeCovers +
      asset._count.tenantLogos +
      this.getBlockingPromotionImageCount(asset) +
      asset._count.adCreativeAssets
    );
  }

  private getBlockingPromotionImageCount(
    asset: FileAssetWithActiveUsage,
  ): number {
    return asset.promotionImages.filter(
      (promotion) =>
        promotion.tenantId !== null &&
        promotion.store !== null &&
        promotion.store.tenantId === promotion.tenantId,
    ).length;
  }

  private ensureCanDeactivate(asset: FileAssetWithActiveUsage): void {
    const activeUsageCount = this.getActiveUsageCount(asset);

    if (activeUsageCount > 0) {
      throw new ConflictException(
        `File asset is used by ${activeUsageCount} active entities and cannot be deactivated`,
      );
    }
  }

  private toResponse(asset: FileAssetWithActiveUsage): FileAssetResponseDto {
    return {
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.size,
      url: asset.url,
      path: asset.path,
      provider: asset.provider,
      kind: asset.kind,
      isActive: asset.isActive,
      metadata: asset.metadata,
      uploadedById: asset.uploadedById,
      floorsMapCount: asset._count.floorMaps,
      floorsModelCount: asset._count.floorModels,
      storesLogoCount: asset._count.storeLogos,
      storesCoverCount: asset._count.storeCovers,
      tenantsLogoCount: asset._count.tenantLogos,
      promotionsImageCount: this.getBlockingPromotionImageCount(asset),
      adCreativesCount: asset._count.adCreativeAssets,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
