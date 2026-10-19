import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService as DbService } from '../../database/prisma.service';
import {
  HeaderBannerQueryDto,
  HeaderBannerResponseDto,
} from './dto/header-banner-query.dto';
import { CreateHeaderBannerDto } from './dto/create-header-banner.dto';
import { UpdateHeaderBannerDto } from './dto/update-header-banner.dto';

@Injectable()
export class HeaderBannersService {
  constructor(private readonly prisma: DbService) {}

  async findAll(
    query: HeaderBannerQueryDto,
  ): Promise<{ items: HeaderBannerResponseDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.HeaderBannerWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.headerBanner.findMany({
        where,
        include: {
          asset: {
            select: { id: true, filename: true, url: true, mimeType: true },
          },
          targetStore: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: { select: { id: true, email: true } },
          updatedBy: { select: { id: true, email: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.headerBanner.count({ where }),
    ]);

    return {
      items: items.map(this.toResponse),
      total,
    };
  }

  async findOne(id: string): Promise<HeaderBannerResponseDto> {
    const banner = await this.prisma.headerBanner.findFirst({
      where: { id },
      include: {
        asset: {
          select: { id: true, filename: true, url: true, mimeType: true },
        },
        targetStore: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: { select: { id: true, email: true } },
        updatedBy: { select: { id: true, email: true } },
      },
    });

    if (!banner) {
      throw new NotFoundException('Header banner not found');
    }

    return this.toResponse(banner);
  }

  async create(
    dto: CreateHeaderBannerDto,
    userId: string,
  ): Promise<HeaderBannerResponseDto> {
    await this.ensureStoreExists(dto.targetStoreId);

    try {
      const banner = await this.prisma.headerBanner.create({
        data: {
          title: dto.title.trim(),
          subtitle: dto.subtitle?.trim(),
          linkUrl: dto.linkUrl?.trim(),
          assetId: dto.assetId ?? null,
          targetStoreId: dto.targetStoreId ?? null,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          asset: {
            select: { id: true, filename: true, url: true, mimeType: true },
          },
          targetStore: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: { select: { id: true, email: true } },
          updatedBy: { select: { id: true, email: true } },
        },
      });

      return this.toResponse(banner);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateHeaderBannerDto,
    userId: string,
  ): Promise<HeaderBannerResponseDto> {
    const existing = await this.prisma.headerBanner.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Header banner not found');
    }

    await this.ensureStoreExists(dto.targetStoreId);

    try {
      const banner = await this.prisma.headerBanner.update({
        where: { id },
        data: {
          title: dto.title === undefined ? undefined : dto.title.trim(),
          subtitle: dto.subtitle === undefined ? undefined : dto.subtitle?.trim(),
          linkUrl:
            dto.linkUrl === undefined ? undefined : dto.linkUrl?.trim(),
          assetId: dto.assetId === undefined ? undefined : dto.assetId ?? null,
          targetStoreId: dto.targetStoreId === undefined ? undefined : dto.targetStoreId ?? null,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
          updatedById: userId,
        },
        include: {
          asset: {
            select: { id: true, filename: true, url: true, mimeType: true },
          },
          targetStore: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: { select: { id: true, email: true } },
          updatedBy: { select: { id: true, email: true } },
        },
      });

      return this.toResponse(banner);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, userId: string): Promise<HeaderBannerResponseDto> {
    const existing = await this.prisma.headerBanner.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Header banner not found');
    }

    const banner = await this.prisma.headerBanner.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: userId,
      },
      include: {
        asset: {
          select: { id: true, filename: true, url: true, mimeType: true },
        },
        targetStore: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: { select: { id: true, email: true } },
        updatedBy: { select: { id: true, email: true } },
      },
    });

    return this.toResponse(banner);
  }

  async findActivePublic(): Promise<HeaderBannerResponseDto> {
    const banner = await this.prisma.headerBanner.findFirst({
      where: { isActive: true, deletedAt: null },
      include: {
        asset: {
          select: { id: true, filename: true, url: true, mimeType: true },
        },
        targetStore: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    if (!banner) {
      throw new NotFoundException('No active header banner');
    }

    return this.toResponse(banner);
  }

  private async ensureStoreExists(storeId: string | null | undefined): Promise<void> {
    if (storeId === undefined || storeId === null) {
      return;
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      throw new BadRequestException('Target store not found');
    }
  }

  private toResponse(banner: any): HeaderBannerResponseDto {
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      linkUrl: banner.linkUrl,
      asset: banner.asset
        ? {
            id: banner.asset.id,
            filename: banner.asset.filename,
            url: banner.asset.url,
            mimeType: banner.asset.mimeType,
          }
        : null,
      targetStore: banner.targetStore
        ? {
            id: banner.targetStore.id,
            name: banner.targetStore.name,
            slug: banner.targetStore.slug,
          }
        : null,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      placement: banner.placement,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Referenced file asset no longer exists');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Header banner not found');
      }
    }

    throw error;
  }
}
