import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const TOKEN_LENGTH = 16;
const DEFAULT_TTL_MINUTES = 60;

function randomToken(length: number): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

@Injectable()
export class SharedRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: unknown, ttlMinutes = DEFAULT_TTL_MINUTES) {
    const token = randomToken(TOKEN_LENGTH);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const record = await this.prisma.sharedRoute.create({
      data: {
        token,
        payload: payload as object,
        expiresAt,
      },
    });

    return {
      token: record.token,
      expiresAt: record.expiresAt.toISOString(),
    };
  }

  async getByToken(token: string) {
    const record = await this.prisma.sharedRoute.findUnique({
      where: { token },
    });

    if (!record) {
      throw new NotFoundException('Shared route not found');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Shared route expired');
    }

    return record.payload;
  }
}
