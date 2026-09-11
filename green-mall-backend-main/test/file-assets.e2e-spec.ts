import { ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { FileAssetKind } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("FileAsset API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testRoleId: string | undefined;
  let testUserId: string | undefined;
  let assetId: string | undefined;
  let testFloorId: string | undefined;
  let lifecycleTenantId: string;
  let lifecycleStoreId: string;
  const lifecycleAssetIds: string[] = [];
  const lifecyclePromotionIds: string[] = [];

  const runId = `${Date.now()}-${process.pid}`;
  const testEmail = `file-assets-e2e-${runId}@greenmall.local`;
  const testPassword = "FileAssetE2e12345!";
  const assetFilename = `file-asset-e2e-${runId}.glb`;

  async function createPromotionLifecycleFixture(
    scenario: string,
    data: {
      startsAt: Date | null;
      endsAt: Date | null;
      isActive?: boolean;
      deletedAt?: Date | null;
      tenantId?: string;
    },
  ): Promise<{ assetId: string; promotionId: string }> {
    const asset = await prisma.fileAsset.create({
      data: {
        filename: `file-asset-e2e-${scenario}-${runId}.jpg`,
        url: `https://example.test/assets/${scenario}-${runId}.jpg`,
        mimeType: "image/jpeg",
        kind: FileAssetKind.IMAGE,
        isActive: true,
        uploadedById: testUserId,
      },
      select: { id: true },
    });
    lifecycleAssetIds.push(asset.id);

    const promotion = await prisma.promotion.create({
      data: {
        title: `FileAsset ${scenario} promotion ${runId}`,
        slug: `file-asset-e2e-${scenario}-${runId}`,
        imageAssetId: asset.id,
        tenantId: data.tenantId ?? lifecycleTenantId,
        storeId: lifecycleStoreId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive ?? true,
        deletedAt: data.deletedAt,
      },
      select: { id: true },
    });
    lifecyclePromotionIds.push(promotion.id);

    return { assetId: asset.id, promotionId: promotion.id };
  }

  async function deletePromotionLifecycleFixture(fixture: {
    assetId: string;
    promotionId: string;
  }): Promise<void> {
    await prisma.promotion.deleteMany({ where: { id: fixture.promotionId } });
    await prisma.fileAsset.deleteMany({ where: { id: fixture.assetId } });
  }

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
          description: "Temporary role created by FileAsset e2e tests",
        },
        select: { id: true },
      });
      testRoleId = superAdminRole.id;
    }

    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 10),
        name: "FileAsset E2E User",
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

    const lifecycleTenant = await prisma.tenant.create({
      data: {
        name: `FileAsset Lifecycle Tenant ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    lifecycleTenantId = lifecycleTenant.id;

    const lifecycleStore = await prisma.store.create({
      data: {
        tenantId: lifecycleTenantId,
        name: `FileAsset Lifecycle Store ${runId}`,
        slug: `file-asset-lifecycle-store-${runId}`,
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    lifecycleStoreId = lifecycleStore.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (lifecyclePromotionIds.length > 0) {
          await prisma.promotion.deleteMany({
            where: { id: { in: lifecyclePromotionIds } },
          });
        }

        if (testFloorId) {
          await prisma.floor.deleteMany({ where: { id: testFloorId } });
        }

        if (lifecycleStoreId) {
          await prisma.store.deleteMany({
            where: { id: lifecycleStoreId },
          });
        }

        if (lifecycleTenantId) {
          await prisma.tenant.deleteMany({
            where: { id: lifecycleTenantId },
          });
        }

        const allAssetIds = [
          ...(assetId ? [assetId] : []),
          ...lifecycleAssetIds,
        ];
        if (allAssetIds.length > 0) {
          await prisma.fileAsset.deleteMany({
            where: { id: { in: allAssetIds } },
          });
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

  it("rejects admin FileAsset requests without JWT", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/file-assets")
      .expect(401);
  });

  it("creates an external asset using the authenticated user", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/admin/file-assets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        filename: assetFilename,
        originalName: "FileAsset e2e model.glb",
        url: `https://example.test/assets/${assetFilename}`,
        mimeType: "model/gltf-binary",
        size: 4096,
        path: `internal/e2e/${assetFilename}`,
        provider: "e2e-external",
        kind: FileAssetKind.MODEL_3D,
        metadata: { purpose: "file-asset-e2e" },
      })
      .expect(201);

    assetId = response.body.id as string;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: assetId,
        filename: assetFilename,
        kind: FileAssetKind.MODEL_3D,
        isActive: true,
        uploadedById: testUserId,
      }),
    );
  });

  it("returns the administrative model with usage counts", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/admin/file-assets/${assetId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: assetId,
        floorsMapCount: 0,
        floorsModelCount: 0,
        storesLogoCount: 0,
        storesCoverCount: 0,
        tenantsLogoCount: 0,
        promotionsImageCount: 0,
        adCreativesCount: 0,
      }),
    );
  });

  it("returns only the allowed public fields for an active asset", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/public/file-assets/${assetId}`)
      .expect(200);

    const allowedFields = [
      "id",
      "filename",
      "originalName",
      "url",
      "mimeType",
      "size",
      "provider",
      "kind",
      "metadata",
      "createdAt",
      "updatedAt",
    ];
    const responseFields = Object.keys(response.body);

    expect(response.body.id).toBe(assetId);
    expect(responseFields.sort()).toEqual(allowedFields.sort());
    expect(response.body).not.toHaveProperty("path");
    expect(response.body).not.toHaveProperty("uploadedById");
    expect(response.body).not.toHaveProperty("isActive");
    expect(responseFields.filter((field) => field.endsWith("Count"))).toEqual(
      [],
    );
  });

  it("soft-deactivates an unused asset and hides it from public API", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/file-assets/${assetId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(response.body.isActive).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/public/file-assets/${assetId}`)
      .expect(404);
  });

  it("reactivates the asset and exposes it through public API again", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/file-assets/${assetId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ isActive: true })
      .expect(200);

    expect(response.body.isActive).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/public/file-assets/${assetId}`)
      .expect(200);
  });

  it("blocks deactivation for an asset used by a current active promotion", async () => {
    const now = Date.now();
    const fixture = await createPromotionLifecycleFixture("current", {
      startsAt: new Date(now - 60 * 60 * 1000),
      endsAt: new Date(now + 60 * 60 * 1000),
    });

    try {
      const usageResponse = await request(app.getHttpServer())
        .get(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(usageResponse.body.promotionsImageCount).toBe(1);

      await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(409);
    } finally {
      await deletePromotionLifecycleFixture(fixture);
    }
  });

  it("blocks deactivation for an asset used by a future scheduled promotion", async () => {
    const now = Date.now();
    const fixture = await createPromotionLifecycleFixture("scheduled", {
      startsAt: new Date(now + 60 * 60 * 1000),
      endsAt: new Date(now + 2 * 60 * 60 * 1000),
    });

    try {
      const usageResponse = await request(app.getHttpServer())
        .get(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(usageResponse.body.promotionsImageCount).toBe(1);

      await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(409);
    } finally {
      await deletePromotionLifecycleFixture(fixture);
    }
  });

  it("does not count or block an expired promotion", async () => {
    const now = Date.now();
    const fixture = await createPromotionLifecycleFixture("expired", {
      startsAt: new Date(now - 2 * 60 * 60 * 1000),
      endsAt: new Date(now - 60 * 60 * 1000),
    });

    try {
      const usageResponse = await request(app.getHttpServer())
        .get(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(usageResponse.body.promotionsImageCount).toBe(0);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);
      expect(updateResponse.body.isActive).toBe(false);
    } finally {
      await deletePromotionLifecycleFixture(fixture);
    }
  });

  it("does not count or block an inactive promotion", async () => {
    const now = Date.now();
    const fixture = await createPromotionLifecycleFixture("inactive", {
      startsAt: new Date(now - 60 * 60 * 1000),
      endsAt: new Date(now + 60 * 60 * 1000),
      isActive: false,
    });

    try {
      const usageResponse = await request(app.getHttpServer())
        .get(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(usageResponse.body.promotionsImageCount).toBe(0);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);
      expect(updateResponse.body.isActive).toBe(false);
    } finally {
      await deletePromotionLifecycleFixture(fixture);
    }
  });

  it("does not count or block a soft-deleted promotion", async () => {
    const now = Date.now();
    const fixture = await createPromotionLifecycleFixture("deleted", {
      startsAt: new Date(now - 60 * 60 * 1000),
      endsAt: new Date(now + 60 * 60 * 1000),
      deletedAt: new Date(now),
    });

    try {
      const usageResponse = await request(app.getHttpServer())
        .get(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(usageResponse.body.promotionsImageCount).toBe(0);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);
      expect(updateResponse.body.isActive).toBe(false);
    } finally {
      await deletePromotionLifecycleFixture(fixture);
    }
  });

  it("does not count or block a promotion whose tenant differs from its store tenant", async () => {
    const mismatchedTenant = await prisma.tenant.create({
      data: {
        name: `FileAsset Mismatched Tenant ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    let fixture:
      Awaited<ReturnType<typeof createPromotionLifecycleFixture>> | undefined;

    try {
      fixture = await createPromotionLifecycleFixture("tenant-mismatch", {
        startsAt: null,
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
        tenantId: mismatchedTenant.id,
      });

      const usageResponse = await request(app.getHttpServer())
        .get(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(usageResponse.body.promotionsImageCount).toBe(0);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);
      expect(updateResponse.body.isActive).toBe(false);

      await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: true })
        .expect(200);

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/admin/file-assets/${fixture.assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(deleteResponse.body.isActive).toBe(false);
    } finally {
      if (fixture) {
        await deletePromotionLifecycleFixture(fixture);
      }
      await prisma.tenant.deleteMany({ where: { id: mismatchedTenant.id } });
    }
  });

  it("rejects deactivation while an active entity uses the asset", async () => {
    const floorNumber = 1_500_000_000 + Math.floor(Date.now() % 500_000_000);
    const floor = await prisma.floor.create({
      data: {
        number: floorNumber,
        name: `FileAsset E2E Floor ${runId}`,
        mapAssetId: assetId,
        isActive: true,
      },
      select: { id: true },
    });
    testFloorId = floor.id;

    try {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/file-assets/${assetId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(409);

      expect(response.body.message).toContain("cannot be deactivated");

      const persistedAsset = await prisma.fileAsset.findUnique({
        where: { id: assetId },
        select: { isActive: true },
      });
      expect(persistedAsset?.isActive).toBe(true);
    } finally {
      await prisma.floor.deleteMany({ where: { id: floor.id } });
      testFloorId = undefined;
    }
  });
});
