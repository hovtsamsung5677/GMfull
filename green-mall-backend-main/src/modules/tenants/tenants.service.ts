import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { TenantQueryDto } from "./dto/tenant-query.dto";
import { TenantResponseDto } from "./dto/tenant-response.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAdmin(query: TenantQueryDto): Promise<TenantResponseDto[]> {
    return this.prisma.tenant.findMany({
      where: this.buildWhere(query),
      orderBy: [{ createdAt: "desc" }],
      ...this.getPagination(query),
    });
  }

  async findOne(id: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    await this.ensureActiveLogoAssetExists(dto.logoAssetId);

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        logoAssetId: dto.logoAssetId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    userId: string,
  ): Promise<TenantResponseDto> {
    await this.ensureActiveLogoAssetExists(dto.logoAssetId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({
        where: { id },
        select: { id: true, isActive: true },
      });

      if (!existing) {
        throw new NotFoundException("Tenant not found");
      }

      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          name: dto.name,
          legalName: dto.legalName,
          description: dto.description,
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          logoAssetId: dto.logoAssetId,
          isActive: dto.isActive,
        },
      });

      if (existing.isActive && dto.isActive === false) {
        await tx.promotion.updateMany({
          where: {
            tenantId: id,
            isActive: true,
            deletedAt: null,
          },
          data: {
            isActive: false,
            updatedById: userId,
          },
        });
      }

      return tenant;
    });
  }

  async remove(id: string, userId: string): Promise<TenantResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException("Tenant not found");
      }

      if (!existing.isActive) {
        return existing;
      }

      const tenant = await tx.tenant.update({
        where: { id },
        data: { isActive: false },
      });
      await tx.promotion.updateMany({
        where: {
          tenantId: id,
          isActive: true,
          deletedAt: null,
        },
        data: {
          isActive: false,
          updatedById: userId,
        },
      });

      return tenant;
    });
  }

  private buildWhere(query: TenantQueryDto): Prisma.TenantWhereInput {
    const where: Prisma.TenantWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const storeFilters: Prisma.StoreWhereInput = {};

    if (query.categoryId) {
      storeFilters.categoryId = query.categoryId;
    }

    if (query.floorId) {
      storeFilters.floorId = query.floorId;
    }

    if (Object.keys(storeFilters).length > 0) {
      where.stores = { some: storeFilters };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { legalName: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { website: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private async ensureExists(id: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
  }

  private async ensureActiveLogoAssetExists(
    assetId: string | null | undefined,
  ): Promise<void> {
    if (assetId === null || assetId === undefined) {
      return;
    }

    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: assetId, isActive: true },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException("Tenant logo asset not found or inactive");
    }
  }

  private getPagination(query: TenantQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }
}
