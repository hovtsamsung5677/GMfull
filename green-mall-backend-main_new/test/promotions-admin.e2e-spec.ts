import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FileAssetKind } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Promotions admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let analyticsAccessToken: string;
  let testRoleId: string | undefined;
  let testAnalyticsRoleId: string | undefined;
  let testUserId: string | undefined;
  let analyticsUserId: string | undefined;
  let promotionId: string | undefined;

  const tenantIds: string[] = [];
  const storeIds: string[] = [];
  const assetIds: string[] = [];

  const runId = `${Date.now()}-${process.pid}`;
  const prefix = `promotions-e2e-${runId}`;
  const testEmail = `${prefix}@greenmall.local`;
  const testPassword = "PromotionsE2e12345!";
  const promotionSlug = `${prefix}-summer-sale`;

  let tenantId: string;
  let otherTenantId: string;
  let storeId: string;
  let imageAssetId: string;
  let inactiveImageAssetId: string;
  let modelAssetId: string;

  const buildPromotionBody = (overrides: Record<string, unknown> = {}) => ({
    title: `Promotion E2E ${runId}`,
    slug: promotionSlug,
    description: "Isolated promotion created by the e2e suite.",
    terms: "Valid while stocks last.",
    buttonText: "Подробнее",
    buttonUrl: "/stores/e2e",
    tenantId,
    storeId,
    imageAssetId,
    startsAt: "2026-07-20T07:00:00.000Z",
    endsAt: "2026-08-20T20:00:00.000Z",
    isActive: true,
    sortOrder: 10,
    metadata: { source: "promotions-admin-e2e" },
    ...overrides,
  });

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
          description: "Temporary role created by Promotions e2e tests",
        },
        select: { id: true },
      });
      testRoleId = superAdminRole.id;
    }

    let analyticsRole = await prisma.role.findUnique({
      where: { name: "ANALYTICS_VIEWER" },
      select: { id: true },
    });

    if (!analyticsRole) {
      analyticsRole = await prisma.role.create({
        data: {
          name: "ANALYTICS_VIEWER",
          description:
            "Temporary analytics role created by Promotions e2e tests",
        },
        select: { id: true },
      });
      testAnalyticsRoleId = analyticsRole.id;
    }

    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 10),
        name: "Promotions E2E User",
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

    const analyticsUser = await prisma.user.create({
      data: {
        email: `${prefix}-analytics@greenmall.local`,
        passwordHash: await bcrypt.hash(testPassword, 10),
        name: "Promotions E2E Analytics User",
        roleId: analyticsRole.id,
        isActive: true,
      },
      select: { id: true },
    });
    analyticsUserId = analyticsUser.id;

    const analyticsLoginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: `${prefix}-analytics@greenmall.local`,
        password: testPassword,
      })
      .expect(201);
    analyticsAccessToken = analyticsLoginResponse.body.accessToken as string;

    const tenant = await prisma.tenant.create({
      data: {
        name: `Promotions E2E Tenant ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    tenantId = tenant.id;
    tenantIds.push(tenant.id);

    const otherTenant = await prisma.tenant.create({
      data: {
        name: `Promotions E2E Other Tenant ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    otherTenantId = otherTenant.id;
    tenantIds.push(otherTenant.id);

    const store = await prisma.store.create({
      data: {
        tenantId,
        name: `Promotions E2E Store ${runId}`,
        slug: `${prefix}-store`,
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    storeId = store.id;
    storeIds.push(store.id);

    const imageAsset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-image.jpg`,
        url: `https://example.test/${prefix}-image.jpg`,
        kind: FileAssetKind.IMAGE,
        isActive: true,
        uploadedById: testUserId,
      },
      select: { id: true },
    });
    imageAssetId = imageAsset.id;
    assetIds.push(imageAsset.id);

    const inactiveImageAsset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-inactive.jpg`,
        url: `https://example.test/${prefix}-inactive.jpg`,
        kind: FileAssetKind.IMAGE,
        isActive: false,
        uploadedById: testUserId,
      },
      select: { id: true },
    });
    inactiveImageAssetId = inactiveImageAsset.id;
    assetIds.push(inactiveImageAsset.id);

    const modelAsset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-model.glb`,
        url: `https://example.test/${prefix}-model.glb`,
        kind: FileAssetKind.MODEL_3D,
        isActive: true,
        uploadedById: testUserId,
      },
      select: { id: true },
    });
    modelAssetId = modelAsset.id;
    assetIds.push(modelAsset.id);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.promotion.deleteMany({
          where: { slug: { startsWith: prefix } },
        });

        if (storeIds.length > 0) {
          await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
        }

        if (tenantIds.length > 0) {
          await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
        }

        if (assetIds.length > 0) {
          await prisma.fileAsset.deleteMany({
            where: { id: { in: assetIds } },
          });
        }

        if (testUserId) {
          await prisma.user.deleteMany({ where: { id: testUserId } });
        }

        if (analyticsUserId) {
          await prisma.user.deleteMany({ where: { id: analyticsUserId } });
        }

        if (testRoleId) {
          await prisma.role.deleteMany({ where: { id: testRoleId } });
        }

        if (testAnalyticsRoleId) {
          await prisma.role.deleteMany({ where: { id: testAnalyticsRoleId } });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("rejects admin promotion requests without JWT", async () => {
    await request(app.getHttpServer()).get("/api/admin/promotions").expect(401);
  });

  it("allows analytics reads but rejects promotion changes", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/promotions")
      .set("Authorization", `Bearer ${analyticsAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${analyticsAccessToken}`)
      .send(buildPromotionBody({ slug: `${prefix}-forbidden` }))
      .expect(403);
  });

  it("creates a promotion and records tenant/author fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(buildPromotionBody())
      .expect(201);

    promotionId = response.body.id as string;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: promotionId,
        slug: promotionSlug,
        tenantId,
        storeId,
        imageAssetId,
        createdById: testUserId,
        updatedById: testUserId,
        deletedAt: null,
      }),
    );
  });

  it("rejects a duplicate slug with 409", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(buildPromotionBody({ title: "Duplicate slug promotion" }))
      .expect(409);
  });

  it("rejects an invalid date range", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(
        buildPromotionBody({
          slug: `${prefix}-invalid-dates`,
          startsAt: "2026-08-20T20:00:00.000Z",
          endsAt: "2026-08-20T20:00:00.000Z",
        }),
      )
      .expect(400);
  });

  it("rejects tenantId that does not own the selected store", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(
        buildPromotionBody({
          slug: `${prefix}-tenant-mismatch`,
          tenantId: otherTenantId,
        }),
      )
      .expect(400);
  });

  it("rejects inactive and non-image assets", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(
        buildPromotionBody({
          slug: `${prefix}-inactive-image`,
          imageAssetId: inactiveImageAssetId,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(
        buildPromotionBody({
          slug: `${prefix}-model-image`,
          imageAssetId: modelAssetId,
        }),
      )
      .expect(400);
  });

  it("returns the created promotion in the filtered admin list", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({
        search: promotionSlug,
        storeId,
        tenantId,
        isActive: true,
        page: 1,
        limit: 20,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: promotionId, slug: promotionSlug }),
      ]),
    );
  });

  it("updates a promotion and records updatedById from JWT", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: `Updated Promotion E2E ${runId}`,
        buttonText: "Открыть магазин",
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: promotionId,
        title: `Updated Promotion E2E ${runId}`,
        buttonText: "Открыть магазин",
        createdById: testUserId,
        updatedById: testUserId,
      }),
    );
  });

  it("soft-deletes a promotion and excludes it from normal reads", async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/admin/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.deletedAt).toEqual(expect.any(String));
    expect(response.body.isActive).toBe(false);
    expect(response.body.updatedById).toBe(testUserId);

    const listResponse = await request(app.getHttpServer())
      .get("/api/admin/promotions")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ search: promotionSlug })
      .expect(200);

    expect(
      listResponse.body.some(
        (promotion: { id: string }) => promotion.id === promotionId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/admin/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("rejects updates and repeated deletes for a soft-deleted promotion", async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Must not be updated" })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/admin/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});
