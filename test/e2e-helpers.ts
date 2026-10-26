import { INestApplication, ValidationPipe } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

export interface AdminSession {
  accessToken: string;
  userId: string;
  roleId: string;
}

export interface E2ECtx {
  app: INestApplication;
  prisma: PrismaService;
  session: AdminSession;
  adminPassword: string;
  runId: string;
  createdRole: boolean;
}

export const ADMIN_PASSWORD = "E2EAdmin12345!";

export async function createE2EApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix("api");
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

export async function loginAsSuperAdmin(
  app: INestApplication,
  prisma: PrismaService,
  runId: string,
): Promise<{ session: AdminSession; createdRole: boolean }> {
  const email = `e2e-admin-${runId}@greenmall.local`;

  const existing = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
    select: { id: true },
  });

  if (existing) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        name: `E2E Admin ${runId}`,
        roleId: existing.id,
        isActive: true,
      },
      select: { id: true },
    });

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password: ADMIN_PASSWORD })
      .expect(201);

    return {
      session: { accessToken: login.body.accessToken, userId: user.id, roleId: existing.id },
      createdRole: false,
    };
  }

  const role = await prisma.role.create({
    data: { name: "SUPER_ADMIN", description: `temp e2e role ${runId}` },
    select: { id: true },
  });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      name: `E2E Admin ${runId}`,
      roleId: role.id,
      isActive: true,
    },
    select: { id: true },
  });

  const login = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email, password: ADMIN_PASSWORD })
    .expect(201);

  return {
    session: { accessToken: login.body.accessToken, userId: user.id, roleId: role.id },
    createdRole: true,
  };
}

export async function teardownE2EApp(
  app: INestApplication,
  prisma: PrismaService,
  opts: { userId?: string; roleId?: string; createdRole?: boolean },
): Promise<void> {
  try {
    if (opts.userId) {
      await prisma.user.deleteMany({ where: { id: opts.userId } });
    }
    if (opts.createdRole && opts.roleId) {
      await prisma.role.deleteMany({ where: { id: opts.roleId } });
    }
  } finally {
    await app.close();
  }
}
