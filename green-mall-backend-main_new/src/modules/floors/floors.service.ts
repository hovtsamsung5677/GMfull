import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { FloorQueryDto } from './dto/floor-query.dto';
import { FloorResponseDto } from './dto/floor-response.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: FloorQueryDto): Promise<FloorResponseDto[]> {
    return this.prisma.floor.findMany({
      where: this.buildWhere(query, true),
      orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }],
      ...this.getPagination(query),
    });
  }

  async findAdmin(query: FloorQueryDto): Promise<FloorResponseDto[]> {
    return this.prisma.floor.findMany({
      where: this.buildWhere(query),
      orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }],
      ...this.getPagination(query),
    });
  }

  async findPublicOne(id: string): Promise<FloorResponseDto> {
    return this.findOneOrThrow(id, true);
  }

  async findAdminOne(id: string): Promise<FloorResponseDto> {
    return this.findOneOrThrow(id);
  }

  async create(dto: CreateFloorDto): Promise<FloorResponseDto> {
    await this.ensureAssetExists(dto.mapAssetId, 'Map asset');
    await this.ensureAssetExists(dto.modelAssetId, 'Model asset');

    try {
      return await this.prisma.floor.create({
        data: {
          number: dto.number,
          name: dto.name,
          mapImageUrl: dto.mapImageUrl,
          width: dto.width,
          height: dto.height,
          depth: dto.depth,
          unit: dto.unit,
          mapAssetId: dto.mapAssetId,
          modelAssetId: dto.modelAssetId,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          description: dto.description,
          sortOrder: dto.sortOrder ?? dto.number,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateFloorDto): Promise<FloorResponseDto> {
    await this.ensureExists(id);
    await this.ensureAssetExists(dto.mapAssetId, 'Map asset');
    await this.ensureAssetExists(dto.modelAssetId, 'Model asset');

    try {
      return await this.prisma.floor.update({
        where: { id },
        data: {
          number: dto.number,
          name: dto.name,
          mapImageUrl: dto.mapImageUrl,
          width: dto.width,
          height: dto.height,
          depth: dto.depth,
          unit: dto.unit,
          mapAssetId: dto.mapAssetId,
          modelAssetId: dto.modelAssetId,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          description: dto.description,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<FloorResponseDto> {
    await this.ensureExists(id);

    return this.prisma.floor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private buildWhere(
    query: FloorQueryDto,
    publicOnly = false,
  ): Prisma.FloorWhereInput {
    const where: Prisma.FloorWhereInput = {};

    if (publicOnly) {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.floorId) {
      where.id = query.floorId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async findOneOrThrow(
    id: string,
    publicOnly = false,
  ): Promise<FloorResponseDto> {
    const floor = await this.prisma.floor.findFirst({
      where: {
        id,
        ...(publicOnly ? { isActive: true } : {}),
      },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    return floor;
  }

  private async ensureExists(id: string): Promise<void> {
    const floor = await this.prisma.floor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }
  }

  private async ensureAssetExists(
    assetId: string | null | undefined,
    assetName: string,
  ): Promise<void> {
    if (assetId === undefined || assetId === null) {
      return;
    }

    const asset = await this.prisma.fileAsset.findUnique({
      where: { id: assetId },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException(`${assetName} not found`);
    }
  }

  private getPagination(query: FloorQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Floor number already exists');
    }

    throw error;
  }
}
