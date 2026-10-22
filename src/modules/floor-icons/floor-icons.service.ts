import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FloorIconQueryDto } from './dto/floor-icon-query.dto';
import { CreateFloorIconDto } from './dto/create-floor-icon.dto';
import { UpdateFloorIconDto } from './dto/update-floor-icon.dto';
import { FloorIconResponseDto } from './dto/floor-icon-response.dto';

const iconAssetSelect = {
  id: true,
  filename: true,
  url: true,
  kind: true,
  isActive: true,
} as const;

@Injectable()
export class FloorIconsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FloorIconQueryDto): Promise<FloorIconResponseDto[]> {
    const icons = await this.prisma.floorIcon.findMany({
      where: {
        ...(query.floorId ? { floorId: query.floorId } : {}),
        isActive: true,
      },
      include: { asset: { select: iconAssetSelect } },
      orderBy: { sortOrder: 'asc' },
    });
    return icons.map(this.toResponse);
  }

  async findById(id: string): Promise<FloorIconResponseDto | null> {
    const icon = await this.prisma.floorIcon.findUnique({
      where: { id },
      include: { asset: { select: iconAssetSelect } },
    });
    return icon ? this.toResponse(icon) : null;
  }

  async create(dto: CreateFloorIconDto): Promise<FloorIconResponseDto> {
    await this.ensureReferencesExist(dto.floorId, dto.assetId, dto.storeId);

    const icon = await this.prisma.floorIcon.create({
      data: {
        name: dto.name,
        type: dto.type ?? 'IMAGE',
        floorId: dto.floorId,
        storeId: dto.storeId ?? null,
        assetId: dto.assetId ?? null,
        x: dto.x,
        y: dto.y,
        z: dto.z ?? 0,
        rotation: dto.rotation ?? 0,
        scaleX: dto.scaleX ?? 1,
        scaleY: dto.scaleY ?? 1,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { asset: { select: iconAssetSelect } },
    });
    return this.toResponse(icon);
  }

  async update(id: string, dto: UpdateFloorIconDto): Promise<FloorIconResponseDto> {
    const existing = await this.prisma.floorIcon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Floor icon not found');
    }

    await this.ensureReferencesExist(
      dto.floorId ?? existing.floorId,
      dto.assetId === undefined ? existing.assetId : dto.assetId,
      dto.storeId === undefined ? existing.storeId : dto.storeId,
    );

    const icon = await this.prisma.floorIcon.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.floorId !== undefined ? { floorId: dto.floorId } : {}),
        ...(dto.storeId !== undefined ? { storeId: dto.storeId ?? null } : {}),
        ...(dto.assetId !== undefined ? { assetId: dto.assetId } : {}),
        ...(dto.x !== undefined ? { x: dto.x } : {}),
        ...(dto.y !== undefined ? { y: dto.y } : {}),
        ...(dto.z !== undefined ? { z: dto.z } : {}),
        ...(dto.rotation !== undefined ? { rotation: dto.rotation } : {}),
        ...(dto.scaleX !== undefined ? { scaleX: dto.scaleX } : {}),
        ...(dto.scaleY !== undefined ? { scaleY: dto.scaleY } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: { asset: { select: iconAssetSelect } },
    });
    return this.toResponse(icon);
  }

  async remove(id: string): Promise<FloorIconResponseDto> {
    const existing = await this.prisma.floorIcon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Floor icon not found');
    }

    const icon = await this.prisma.floorIcon.update({
      where: { id },
      data: { isActive: false },
      include: { asset: { select: iconAssetSelect } },
    });
    return this.toResponse(icon);
  }

  private async ensureReferencesExist(
    floorId: string,
    assetId: string | null | undefined,
    storeId?: string | null,
  ): Promise<void> {
    const floor = await this.prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true },
    });
    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    if (assetId) {
      const asset = await this.prisma.fileAsset.findFirst({
        where: { id: assetId, isActive: true },
        select: { id: true },
      });
      if (!asset) {
        throw new NotFoundException('File asset not found');
      }
    }

    if (storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true },
      });
      if (!store) {
        throw new NotFoundException('Store not found');
      }
    }
  }

  private toResponse(icon: any): FloorIconResponseDto {
    return {
      id: icon.id,
      name: icon.name,
      type: icon.type ?? 'IMAGE',
      floorId: icon.floorId,
      storeId: icon.storeId,
      assetId: icon.assetId ?? null,
      x: icon.x,
      y: icon.y,
      z: icon.z ?? 0,
      rotation: icon.rotation ?? 0,
      scaleX: icon.scaleX ?? 1,
      scaleY: icon.scaleY ?? 1,
      isActive: icon.isActive,
      sortOrder: icon.sortOrder ?? 0,
      createdAt: icon.createdAt,
      updatedAt: icon.updatedAt,
      asset: icon.asset
        ? {
            id: icon.asset.id,
            filename: icon.asset.filename,
            url: icon.asset.url,
            kind: icon.asset.kind,
            isActive: icon.asset.isActive,
          }
        : null,
    };
  }
}
