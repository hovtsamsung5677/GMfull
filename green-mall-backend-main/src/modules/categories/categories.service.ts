import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../../common/utils/slugify.util';
import { PrismaService } from '../../database/prisma.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: this.buildWhere(query, true),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      ...this.getPagination(query),
    });

    return categories;
  }

  async findAdmin(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: this.buildWhere(query),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      ...this.getPagination(query),
    });

    return categories;
  }

  async findPublicOne(id: string): Promise<CategoryResponseDto> {
    return this.findOneOrThrow(id, true);
  }

  async findAdminOne(id: string): Promise<CategoryResponseDto> {
    return this.findOneOrThrow(id);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          icon: dto.icon,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    await this.ensureExists(id);
    const slug = dto.slug
      ? await this.resolveSlug(dto.slug, dto.slug, id, true)
      : undefined;

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          icon: dto.icon,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<CategoryResponseDto> {
    await this.ensureExists(id);

    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private buildWhere(
    query: CategoryQueryDto,
    publicOnly = false,
  ): Prisma.CategoryWhereInput {
    const where: Prisma.CategoryWhereInput = {};

    if (publicOnly) {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.id = query.categoryId;
    }

    if (query.floorId) {
      where.OR = [
        ...(where.OR ?? []),
        { stores: { some: { floorId: query.floorId } } },
        { mapObjects: { some: { floorId: query.floorId } } },
      ];
    }

    if (query.search) {
      const searchWhere: Prisma.CategoryWhereInput[] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];

      where.AND = [{ OR: searchWhere }];
    }

    return where;
  }

  private async findOneOrThrow(
    id: string,
    publicOnly = false,
  ): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        ...(publicOnly ? { isActive: true } : {}),
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async ensureExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async resolveSlug(
    slugValue: string | undefined,
    fallback: string,
    currentId?: string,
    explicit = Boolean(slugValue),
  ): Promise<string> {
    const baseSlug = slugify(slugValue || fallback);

    if (explicit) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          slug: baseSlug,
          ...(currentId ? { id: { not: currentId } } : {}),
        },
        select: { id: true },
      });

      if (conflict) {
        throw new ConflictException('Category slug already exists');
      }

      return baseSlug;
    }

    return this.getAvailableSlug(baseSlug);
  }

  private async getAvailableSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let counter = 2;

    while (
      await this.prisma.category.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private getPagination(query: CategoryQueryDto) {
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
      throw new ConflictException('Category slug already exists');
    }

    throw error;
  }
}
