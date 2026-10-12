import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  AuthenticatedUser,
  SUPER_ADMIN_ROLE,
} from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";

const userWithRole = {
  role: true,
} satisfies Prisma.UserInclude;

export type UserWithRole = Prisma.UserGetPayload<{
  include: typeof userWithRole;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      include: userWithRole,
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userWithRole,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.ensureRoleExists(dto.roleId);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.fullName,
          phone: dto.phone,
          roleId: dto.roleId,
          isActive: dto.isActive ?? true,
        },
        include: userWithRole,
      });

      return this.toResponse(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    if (dto.roleId) {
      await this.ensureRoleExists(dto.roleId);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          email: dto.email?.toLowerCase(),
          passwordHash,
          name: dto.fullName,
          phone: dto.phone,
          roleId: dto.roleId,
          isActive: dto.isActive,
        },
        include: userWithRole,
      });

      return this.toResponse(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    const user = await this.prisma.user.delete({
      where: { id },
      include: userWithRole,
    });

    return this.toResponse(user);
  }

  findByEmailForAuth(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userWithRole,
    });
  }

  findByIdForAuth(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithRole,
    });
  }

  async updateLastLoginAt(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  toAuthUser(user: UserWithRole): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role.name,
      isSuperAdmin: user.role.name === SUPER_ADMIN_ROLE,
    };
  }

  private toResponse(user: UserWithRole): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.name,
      phone: user.phone,
      isActive: user.isActive,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async ensureUserExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }
  }

  private async ensureRoleExists(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("User with this email already exists");
    }

    throw error;
  }
}
