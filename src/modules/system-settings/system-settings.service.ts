import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  SystemSettingQueryDto,
  SystemSettingResponseDto,
  UpsertSystemSettingDto,
} from "./dto/system-setting.dto";

type SystemSettingRecord = Prisma.SystemSettingGetPayload<Record<string, never>>;

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async find(query: SystemSettingQueryDto): Promise<SystemSettingResponseDto[]> {
    const where: Prisma.SystemSettingWhereInput = {};

    if (query.keyPrefix) {
      where.key = { startsWith: query.keyPrefix };
    }

    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }

    const settings = await this.prisma.systemSetting.findMany({
      where,
      orderBy: [{ key: "asc" }],
      ...this.getPagination(query),
    });

    return settings.map((setting) => this.toResponse(setting));
  }

  async findPublic(): Promise<SystemSettingResponseDto[]> {
    return this.find({ isPublic: true });
  }

  async upsert(
    dto: UpsertSystemSettingDto,
  ): Promise<SystemSettingResponseDto> {
    const record = await this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      update: {
        value: (dto.value ?? {}) as Prisma.InputJsonValue,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
      },
      create: {
        key: dto.key,
        value: (dto.value ?? {}) as Prisma.InputJsonValue,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
      },
    });

    return this.toResponse(record);
  }

  async remove(key: string): Promise<SystemSettingResponseDto> {
    const record = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!record) {
      throw new NotFoundException(`System setting "${key}" not found`);
    }

    const deleted = await this.prisma.systemSetting.delete({
      where: { key },
    });

    return this.toResponse(deleted);
  }

  async getJson<T = Record<string, unknown>>(key: string): Promise<T | null> {
    const record = await this.prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!record) {
      return null;
    }

    return (record.value as T) ?? null;
  }

  private getPagination(query: SystemSettingQueryDto) {
    const page = query.page;
    const limit = query.limit;

    if (page == null && limit == null) {
      return undefined;
    }

    const safePage = Math.max(1, page ?? 1);
    const safeLimit = Math.max(1, limit ?? 50);

    return {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  }

  private toResponse(
    record: SystemSettingRecord,
  ): SystemSettingResponseDto {
    return {
      id: record.id,
      key: record.key,
      value: (record.value ?? {}) as Record<string, unknown>,
      description: record.description ?? null,
      isPublic: record.isPublic,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}