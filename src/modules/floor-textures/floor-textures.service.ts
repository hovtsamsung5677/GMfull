import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, FileAssetKind } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreateFloorTextureDto } from "./dto/create-floor-texture.dto";
import { FloorTextureResponseDto } from "./dto/floor-texture-response.dto";
import { UpdateFloorTextureDto } from "./dto/update-floor-texture.dto";
import { PublicFloorTextureDto } from "./dto/public-floor-texture.dto";
import {
  publicFileAssetSelect,
  toPublicFileAssetResponse,
} from "../file-assets/public-file-asset.projection";

type FloorTextureWithAsset = Prisma.FloorTextureGetPayload<{
  include: { asset: { select: typeof publicFileAssetSelect } };
}>;

@Injectable()
export class FloorTexturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFloor(floorId: string): Promise<PublicFloorTextureDto[]> {
    const textures = await this.prisma.floorTexture.findMany({
      where: { floorId, isActive: true },
      include: {
        asset: {
          select: {
            ...publicFileAssetSelect,
            isActive: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return textures
      .filter((t) => t.asset.isActive)
      .map((t) => this.toPublicDto(t));
  }

  async findAll(query: {
    floorId?: string;
  }): Promise<FloorTextureResponseDto[]> {
    const textures = await this.prisma.floorTexture.findMany({
      where: {
        ...(query.floorId ? { floorId: query.floorId } : {}),
      },
      include: {
        asset: { select: publicFileAssetSelect },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return textures.map((t) => this.toAdminDto(t));
  }

  async findOne(id: string): Promise<FloorTextureResponseDto> {
    const texture = await this.findOneOrThrow(id);
    return this.toAdminDto(texture);
  }

  async create(dto: CreateFloorTextureDto): Promise<FloorTextureResponseDto> {
    await this.ensureFloorExists(dto.floorId);
    await this.ensureImageAsset(dto.assetId);

    const texture = await this.prisma.floorTexture.create({
      data: {
        floorId: dto.floorId,
        assetId: dto.assetId,
        targetMesh: dto.targetMesh,
        materialSlot: dto.materialSlot,
        opacity: dto.opacity ?? 1,
        blendMode: dto.blendMode ?? "normal",
        positionX: dto.positionX ?? 0,
        positionY: dto.positionY ?? 0,
        scaleX: dto.scaleX ?? 1,
        scaleY: dto.scaleY ?? 1,
        rotation: dto.rotation ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        asset: { select: publicFileAssetSelect },
      },
    });

    return this.toAdminDto(texture);
  }

  async update(
    id: string,
    dto: UpdateFloorTextureDto,
  ): Promise<FloorTextureResponseDto> {
    const existing = await this.findOneOrThrow(id);

    if (dto.assetId !== undefined) {
      await this.ensureImageAsset(dto.assetId);
    }

    const texture = await this.prisma.floorTexture.update({
      where: { id },
      data: {
        floorId: dto.floorId,
        assetId: dto.assetId,
        targetMesh: dto.targetMesh,
        materialSlot: dto.materialSlot,
        opacity: dto.opacity,
        blendMode: dto.blendMode,
        positionX: dto.positionX,
        positionY: dto.positionY,
        scaleX: dto.scaleX,
        scaleY: dto.scaleY,
        rotation: dto.rotation,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: {
        asset: { select: publicFileAssetSelect },
      },
    });

    return this.toAdminDto(texture);
  }

  async remove(id: string): Promise<FloorTextureResponseDto> {
    await this.findOneOrThrow(id);

    const texture = await this.prisma.floorTexture.update({
      where: { id },
      data: { isActive: false },
      include: {
        asset: { select: publicFileAssetSelect },
      },
    });

    return this.toAdminDto(texture);
  }

  private async findOneOrThrow(id: string): Promise<FloorTextureWithAsset> {
    const texture = await this.prisma.floorTexture.findUnique({
      where: { id },
      include: {
        asset: { select: publicFileAssetSelect },
      },
    });

    if (!texture) {
      throw new NotFoundException("Floor texture not found");
    }

    return texture;
  }

  private async ensureFloorExists(floorId: string): Promise<void> {
    const floor = await this.prisma.floor.findUnique({
      where: { id: floorId },
      select: { id: true },
    });

    if (!floor) {
      throw new NotFoundException("Floor not found");
    }
  }

  private async ensureImageAsset(assetId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUnique({
      where: { id: assetId },
      select: { id: true, kind: true, isActive: true },
    });

    if (!asset) {
      throw new NotFoundException("File asset not found");
    }

    if (asset.kind !== FileAssetKind.IMAGE) {
      throw new BadRequestException("Asset must be of kind IMAGE");
    }

    if (!asset.isActive) {
      throw new BadRequestException("File asset is not active");
    }
  }

  private toAdminDto(t: FloorTextureWithAsset): FloorTextureResponseDto {
    return {
      id: t.id,
      floorId: t.floorId,
      asset: t.asset ? toPublicFileAssetResponse(t.asset) : null,
      targetMesh: t.targetMesh,
      materialSlot: t.materialSlot,
      opacity: t.opacity,
      blendMode: t.blendMode,
      positionX: t.positionX,
      positionY: t.positionY,
      scaleX: t.scaleX,
      scaleY: t.scaleY,
      rotation: t.rotation,
      sortOrder: t.sortOrder,
      isActive: t.isActive,
      metadata: t.metadata,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private toPublicDto(t: FloorTextureWithAsset): PublicFloorTextureDto {
    const asset = t.asset?.isActive ? toPublicFileAssetResponse(t.asset) : null;

    return {
      id: t.id,
      floorId: t.floorId,
      asset,
      targetMesh: t.targetMesh,
      materialSlot: t.materialSlot,
      opacity: t.opacity,
      blendMode: t.blendMode,
      positionX: t.positionX,
      positionY: t.positionY,
      scaleX: t.scaleX,
      scaleY: t.scaleY,
      rotation: t.rotation,
      sortOrder: t.sortOrder,
    };
  }
}
