import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as crypto from "node:crypto";
import { PrismaService } from "../../database/prisma.service";

const REFRESH_TTL_DAYS = 7;

export interface RefreshTokenRecord {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

@Injectable()
export class RefreshTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    meta: { userAgent?: string | null; ip?: string | null },
  ): Promise<RefreshTokenRecord> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

    const record = await this.prisma.refreshToken.create({
      data: {
        token: generateToken(),
        userId,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    });

    return this.toRecord(record);
  }

  async validate(token: string): Promise<RefreshTokenRecord> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (record.revokedAt) {
      throw new UnauthorizedException("Refresh token was revoked");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    return this.toRecord(record);
  }

  /**
   * Rotates a refresh token: revokes the old one and issues a fresh pair.
   * Implemented as a transaction so a partial failure can never leave a
   * valid old token behind.
   */
  async rotate(
    oldToken: string,
    meta: { userAgent?: string | null; ip?: string | null },
  ): Promise<RefreshTokenRecord> {
    const record = await this.validate(oldToken);

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

      const newRecord = await tx.refreshToken.create({
        data: {
          token: generateToken(),
          userId: record.userId,
          expiresAt,
          userAgent: meta.userAgent ?? null,
          ip: meta.ip ?? null,
        },
      });

      return this.toRecord(newRecord);
    });
  }

  async revoke(token: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!record || record.revokedAt) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }

  private toRecord(record: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
    userAgent: string | null;
    ip: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RefreshTokenRecord {
    return {
      id: record.id,
      token: record.token,
      userId: record.userId,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      userAgent: record.userAgent,
      ip: record.ip,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
