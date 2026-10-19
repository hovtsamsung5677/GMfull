import { ValidationPipe } from "@nestjs/common";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FileAssetKind } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("FloorIcons API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testRoleId: string | undefined;
  let testUserId: string | undefined;
  let testFloorId: string | undefined;
  let testAssetId: string | undefined;
  let testIconId: string | undefined;

  const runId = `${Date.now()}-${process.pid}`;
  const testEmail = `floor-icons-e2e-${runId}@greenmall.local`;
  const testPassword = "FloorIconsE2e12345!";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    let superAdminRole = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
      select: { id: true },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: "SUPER_ADMIN",
          description: "Temporary role created by FloorIcons e2e tests",
        },
        select: { id: true },
      });
      testRoleId = superAdminRole.id;
    }

    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 10),
        name: "FloorIcons E2E User",
        roleId: superAdminRole.id,
        isActive: true,
      },
      select: { id: true },
    });
    testUserId = testUser.id;

    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    accessToken = loginResponse.body.accessToken as string;

    const maxFloor = await prisma.floor.aggregate({
      _max: { number: true },
    });

    const floor = await prisma.floor.create({
      data: {
        number: (maxFloor._max.number ?? 0) + 1,
        name: `FloorIcons E2E Floor ${runId}`,
        width: 900,
        height: 600,
        unit: "cm",
        isActive: true,
      },
      select: { id: true },
    });
    testFloorId = floor.id;

    const asset = await prisma.fileAsset.create({
      data: {
        filename: `floor-icon-e2e-${runId}.png`,
        originalName: "floor-icon-e2e.png",
        url: `https://example.test/assets/floor-icon-e2e-${runId}.png`,
        mimeType: "image/png",
        size: 1024,
        kind: FileAssetKind.IMAGE,
        isActive: true,
        uploadedById: testUserId,
      },
      select: { id: true },
    });
    testAssetId = asset.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.floorIcon.deleteMany({ where: { assetId: testAssetId } });

        if (testIconId) {
          await prisma.floorIcon.deleteMany({ where: { id: testIconId } });
        }

        if (testAssetId) {
          await prisma.fileAsset.deleteMany({ where: { id: testAssetId } });
        }

        if (testFloorId) {
          await prisma.floor.deleteMany({ where: { id: testFloorId } });
        }

        if (testUserId) {
          await prisma.user.deleteMany({ where: { id: testUserId } });
        }

        if (testRoleId) {
          await prisma.role.deleteMany({ where: { id: testRoleId } });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("rejects admin FloorIcon requests without JWT", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/floor-icons")
      .expect(401);
  });

  it("returns an empty public list for a floor without icons", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/public/floor-icons?floorId=${testFloorId}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("rejects admin requests without JWT", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/floor-icons")
      .send({
        name: "no-auth",
        floorId: testFloorId,
        assetId: testAssetId,
        x: 1,
        y: 1,
      })
      .expect(401);
  });

  it("creates a floor icon pinned to the 3D model", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/admin/floor-icons")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "FloorIcon E2E",
        floorId: testFloorId,
        assetId: testAssetId,
        x: 120.5,
        y: 240.25,
        z: 15,
        rotation: 90,
        scaleX: 0.05,
        scaleY: 0.06,
        sortOrder: 3,
      })
      .expect(201);

    testIconId = response.body.id as string;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: testIconId,
        name: "FloorIcon E2E",
        floorId: testFloorId,
        assetId: testAssetId,
        x: 120.5,
        y: 240.25,
        z: 15,
        rotation: 90,
        scaleX: 0.05,
        scaleY: 0.06,
        sortOrder: 3,
        isActive: true,
      }),
    );

    expect(response.body.asset).toEqual(
      expect.objectContaining({
        id: testAssetId,
        url: `https://example.test/assets/floor-icon-e2e-${runId}.png`,
        kind: FileAssetKind.IMAGE,
      }),
    );
  });

  it("rejects creation with a missing name and coordinates", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/floor-icons")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        floorId: testFloorId,
        assetId: testAssetId,
      })
      .expect(400);
  });

  it("rejects creation for an unknown floor", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/floor-icons")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "unknown floor",
        floorId: "missing-floor-id",
        assetId: testAssetId,
        x: 1,
        y: 2,
      })
      .expect(404);
  });

  it("rejects creation for an unknown asset", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/floor-icons")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "unknown asset",
        floorId: testFloorId,
        assetId: "missing-asset-id",
        x: 1,
        y: 2,
      })
      .expect(404);
  });

  it("lists the created icon for the floor", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/public/floor-icons?floorId=${testFloorId}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        id: testIconId,
        name: "FloorIcon E2E",
        floorId: testFloorId,
      }),
    );
  });

  it("moves and rescales an existing icon", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/floor-icons/${testIconId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        x: 300,
        y: 400,
        scaleX: 0.1,
        rotation: 45,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: testIconId,
        x: 300,
        y: 400,
        z: 15,
        scaleX: 0.1,
        scaleY: 0.06,
        rotation: 45,
        name: "FloorIcon E2E",
      }),
    );
  });

  it("hides the icon from the public scene after deletion", async () => {
    await request(app.getHttpServer())
      .delete(`/api/admin/floor-icons/${testIconId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/public/floor-icons?floorId=${testFloorId}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("returns 404 when updating a missing icon", async () => {
    await request(app.getHttpServer())
      .patch("/api/admin/floor-icons/missing-icon-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "missing" })
      .expect(404);
  });

  it("returns 404 when deleting a missing icon", async () => {
    await request(app.getHttpServer())
      .delete("/api/admin/floor-icons/missing-icon-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});
