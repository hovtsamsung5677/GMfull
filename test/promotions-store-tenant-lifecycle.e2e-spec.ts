import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FileAssetKind, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Promotion Store/Tenant lifecycle (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const roleIds: string[] = [];
  const userIds: string[] = [];
  const tenantIds: string[] = [];
  const storeIds: string[] = [];
  const promotionIds: string[] = [];
  const assetIds: string[] = [];

  const tokens: Record<string, string> = {};
  const actorIds: Record<string, string> = {};
  const runId = `${Date.now()}-${process.pid}`;
  const prefix = `promotion-lifecycle-e2e-${runId}`;
  const password = "PromotionLifecycle12345!";

  const nowWindow = () => {
    const now = Date.now();

    return {
      past: new Date(now - 60 * 60 * 1000),
      future: new Date(now + 60 * 60 * 1000),
      laterFuture: new Date(now + 2 * 60 * 60 * 1000),
      expiredStart: new Date(now - 2 * 60 * 60 * 1000),
      expiredEnd: new Date(now - 60 * 60 * 1000),
    };
  };

  async function ensureRole(name: string): Promise<string> {
    const existing = await prisma.role.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: `Temporary ${name} role for ${prefix}`,
      },
      select: { id: true },
    });
    roleIds.push(role.id);

    return role.id;
  }

  async function createActor(roleName: string): Promise<void> {
    const roleId = await ensureRole(roleName);
    const email = `${prefix}-${roleName.toLowerCase()}@greenmall.local`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name: `${roleName} lifecycle user`,
        roleId,
        isActive: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    actorIds[roleName] = user.id;

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);
    tokens[roleName] = login.body.accessToken as string;
  }

  async function createTenant(
    suffix: string,
    overrides: Partial<Prisma.TenantUncheckedCreateInput> = {},
  ) {
    const tenant = await prisma.tenant.create({
      data: {
        name: `${prefix}-tenant-${suffix}`,
        isActive: true,
        ...overrides,
      },
    });
    tenantIds.push(tenant.id);

    return tenant;
  }

  async function createStore(
    suffix: string,
    tenantId: string | null,
    overrides: Partial<Prisma.StoreUncheckedCreateInput> = {},
  ) {
    const store = await prisma.store.create({
      data: {
        tenantId,
        name: `${prefix}-store-${suffix}`,
        slug: `${prefix}-store-${suffix}`,
        isActive: true,
        isVisible: true,
        ...overrides,
      },
    });
    storeIds.push(store.id);

    return store;
  }

  async function createAsset(suffix: string) {
    const asset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-${suffix}.jpg`,
        url: `https://example.test/${prefix}-${suffix}.jpg`,
        mimeType: "image/jpeg",
        kind: FileAssetKind.IMAGE,
        isActive: true,
      },
    });
    assetIds.push(asset.id);

    return asset;
  }

  async function createPromotion(
    suffix: string,
    storeId: string | null,
    tenantId: string | null,
    overrides: Partial<Prisma.PromotionUncheckedCreateInput> = {},
  ) {
    const { past, future } = nowWindow();
    const promotion = await prisma.promotion.create({
      data: {
        title: `${prefix}-promotion-${suffix}`,
        slug: `${prefix}-promotion-${suffix}`,
        storeId,
        tenantId,
        startsAt: past,
        endsAt: future,
        isActive: true,
        ...overrides,
      },
    });
    promotionIds.push(promotion.id);

    return promotion;
  }

  async function getPromotion(id: string) {
    return prisma.promotion.findUniqueOrThrow({ where: { id } });
  }

  async function getAssetUsage(assetId: string): Promise<number> {
    const response = await request(app.getHttpServer())
      .get(`/api/admin/file-assets/${assetId}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(200);

    return response.body.promotionsImageCount as number;
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

    await createActor("SUPER_ADMIN");
    await createActor("CONTENT_MANAGER");
    await createActor("ADS_MANAGER");
    await createActor("ANALYTICS_VIEWER");
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (promotionIds.length > 0) {
          await prisma.promotion.deleteMany({
            where: { id: { in: promotionIds } },
          });
        }

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

        if (userIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        }

        if (roleIds.length > 0) {
          await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("deactivates store promotions atomically and does not reactivate them", async () => {
    const tenant = await createTenant("store-deactivate");
    const store = await createStore("store-deactivate", tenant.id);
    const otherStore = await createStore("store-unrelated", tenant.id);
    const asset = await createAsset("store-deactivate");
    const promotion = await createPromotion(
      "store-deactivate",
      store.id,
      tenant.id,
      { imageAssetId: asset.id },
    );
    const otherPromotion = await createPromotion(
      "store-unrelated",
      otherStore.id,
      tenant.id,
    );

    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(200);

    expect(await getPromotion(promotion.id)).toEqual(
      expect.objectContaining({
        isActive: false,
        updatedById: actorIds.SUPER_ADMIN,
      }),
    );
    expect((await getPromotion(otherPromotion.id)).isActive).toBe(true);
    expect(await getAssetUsage(asset.id)).toBe(0);

    await request(app.getHttpServer())
      .patch(`/api/admin/file-assets/${asset.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: true })
      .expect(200);
    expect((await getPromotion(promotion.id)).isActive).toBe(false);
  });

  it("keeps promotions active and assets reserved while a store is hidden", async () => {
    const tenant = await createTenant("store-hidden");
    const store = await createStore("store-hidden", tenant.id);
    const asset = await createAsset("store-hidden");
    const promotion = await createPromotion(
      "store-hidden",
      store.id,
      tenant.id,
      { imageAssetId: asset.id },
    );

    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isVisible: false })
      .expect(200);

    expect((await getPromotion(promotion.id)).isActive).toBe(true);
    await request(app.getHttpServer())
      .get(`/api/public/promotions/${promotion.slug}`)
      .expect(404);
    expect(await getAssetUsage(asset.id)).toBe(1);
    await request(app.getHttpServer())
      .patch(`/api/admin/file-assets/${asset.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isVisible: true })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/public/promotions/${promotion.slug}`)
      .expect(200);
  });

  it("applies the same lifecycle on DELETE Store and repeated DELETE is stable", async () => {
    const tenant = await createTenant("store-delete");
    const store = await createStore("store-delete", tenant.id);
    const promotion = await createPromotion(
      "store-delete",
      store.id,
      tenant.id,
    );

    await request(app.getHttpServer())
      .delete(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(200);
    const firstResult = await getPromotion(promotion.id);
    expect(firstResult).toEqual(
      expect.objectContaining({
        isActive: false,
        updatedById: actorIds.SUPER_ADMIN,
      }),
    );

    await request(app.getHttpServer())
      .delete(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(200);
    const secondResult = await getPromotion(promotion.id);
    expect(secondResult.updatedAt.toISOString()).toBe(
      firstResult.updatedAt.toISOString(),
    );
  });

  it("blocks tenantId changes while any non-deleted store promotion exists", async () => {
    const tenant = await createTenant("tenant-change-old");
    const otherTenant = await createTenant("tenant-change-new");
    const store = await createStore("tenant-change-blocked", tenant.id);
    const { expiredStart, expiredEnd } = nowWindow();
    await createPromotion("tenant-change-blocked", store.id, tenant.id, {
      startsAt: expiredStart,
      endsAt: expiredEnd,
      isActive: false,
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ tenantId: otherTenant.id })
      .expect(409);
    expect(response.body.message).toContain(
      "Store tenant cannot be changed while non-deleted promotions exist",
    );
  });

  it("allows tenantId changes without promotions and requires an active new tenant", async () => {
    const tenant = await createTenant("tenant-change-source");
    const activeTenant = await createTenant("tenant-change-active");
    const inactiveTenant = await createTenant("tenant-change-inactive", {
      isActive: false,
    });
    const store = await createStore("tenant-change-allowed", tenant.id);

    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ tenantId: inactiveTenant.id })
      .expect(400);

    const response = await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ tenantId: activeTenant.id })
      .expect(200);
    expect(response.body.tenantId).toBe(activeTenant.id);
  });

  it("deactivates tenant promotions but preserves stores and unrelated promotions", async () => {
    const tenant = await createTenant("tenant-deactivate");
    const otherTenant = await createTenant("tenant-unrelated");
    const store = await createStore("tenant-deactivate", tenant.id);
    const otherStore = await createStore("tenant-unrelated", otherTenant.id);
    const asset = await createAsset("tenant-deactivate");
    const promotion = await createPromotion(
      "tenant-deactivate",
      store.id,
      tenant.id,
      { imageAssetId: asset.id },
    );
    const otherPromotion = await createPromotion(
      "tenant-unrelated",
      otherStore.id,
      otherTenant.id,
    );

    await request(app.getHttpServer())
      .patch(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(200);

    expect(await getPromotion(promotion.id)).toEqual(
      expect.objectContaining({
        isActive: false,
        updatedById: actorIds.SUPER_ADMIN,
      }),
    );
    expect((await getPromotion(otherPromotion.id)).isActive).toBe(true);
    expect(
      (
        await prisma.store.findUniqueOrThrow({
          where: { id: store.id },
          select: { isActive: true },
        })
      ).isActive,
    ).toBe(true);
    expect(await getAssetUsage(asset.id)).toBe(0);

    await request(app.getHttpServer())
      .patch(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: true })
      .expect(200);
    expect((await getPromotion(promotion.id)).isActive).toBe(false);
  });

  it("applies the same lifecycle on DELETE Tenant", async () => {
    const tenant = await createTenant("tenant-delete");
    const store = await createStore("tenant-delete", tenant.id);
    const promotion = await createPromotion(
      "tenant-delete",
      store.id,
      tenant.id,
    );

    await request(app.getHttpServer())
      .delete(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(200);
    expect(await getPromotion(promotion.id)).toEqual(
      expect.objectContaining({
        isActive: false,
        updatedById: actorIds.SUPER_ADMIN,
      }),
    );

    await request(app.getHttpServer())
      .delete(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .expect(200);
  });

  it("requires explicit Store and Tenant links for active promotions", async () => {
    const tenant = await createTenant("promotion-required-links");
    const store = await createStore("promotion-required-links", tenant.id);
    const baseBody = {
      title: `${prefix}-required-links`,
      startsAt: nowWindow().past.toISOString(),
      endsAt: nowWindow().future.toISOString(),
      isActive: true,
    };

    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({
        ...baseBody,
        slug: `${prefix}-missing-store`,
        tenantId: tenant.id,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/promotions")
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({
        ...baseBody,
        slug: `${prefix}-missing-tenant`,
        storeId: store.id,
      })
      .expect(400);
  });

  it("rejects activation for unavailable or inconsistent targets", async () => {
    const activeTenant = await createTenant("promotion-active-target");
    const otherTenant = await createTenant("promotion-other-target");
    const inactiveTenant = await createTenant("promotion-inactive-tenant", {
      isActive: false,
    });
    const inactiveStore = await createStore(
      "promotion-inactive-store",
      activeTenant.id,
      { isActive: false },
    );
    const hiddenStore = await createStore(
      "promotion-hidden-store",
      activeTenant.id,
      { isVisible: false },
    );
    const inactiveTenantStore = await createStore(
      "promotion-inactive-tenant-store",
      inactiveTenant.id,
    );
    const mismatchStore = await createStore(
      "promotion-mismatch-store",
      activeTenant.id,
    );
    const fixtures = [
      await createPromotion(
        "activate-inactive-store",
        inactiveStore.id,
        activeTenant.id,
        { isActive: false },
      ),
      await createPromotion(
        "activate-hidden-store",
        hiddenStore.id,
        activeTenant.id,
        { isActive: false },
      ),
      await createPromotion(
        "activate-inactive-tenant",
        inactiveTenantStore.id,
        inactiveTenant.id,
        { isActive: false },
      ),
      await createPromotion(
        "activate-mismatch",
        mismatchStore.id,
        otherTenant.id,
        { isActive: false },
      ),
    ];

    for (const promotion of fixtures) {
      await request(app.getHttpServer())
        .patch(`/api/admin/promotions/${promotion.id}`)
        .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
        .send({ isActive: true })
        .expect(400);
    }
  });

  it("keeps future valid promotions as blocking FileAsset usage", async () => {
    const tenant = await createTenant("future-asset");
    const store = await createStore("future-asset", tenant.id);
    const asset = await createAsset("future-asset");
    const { future, laterFuture } = nowWindow();
    await createPromotion("future-asset", store.id, tenant.id, {
      imageAssetId: asset.id,
      startsAt: future,
      endsAt: laterFuture,
    });

    expect(await getAssetUsage(asset.id)).toBe(1);
    await request(app.getHttpServer())
      .patch(`/api/admin/file-assets/${asset.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(409);
  });

  it("does not count inactive, deleted, or linkless promotions as asset usage", async () => {
    const tenant = await createTenant("nonblocking-asset");
    const store = await createStore("nonblocking-asset", tenant.id);
    const asset = await createAsset("nonblocking-asset");
    await createPromotion("nonblocking-inactive", store.id, tenant.id, {
      imageAssetId: asset.id,
      isActive: false,
    });
    await createPromotion("nonblocking-deleted", store.id, tenant.id, {
      imageAssetId: asset.id,
      deletedAt: new Date(),
    });
    await createPromotion("nonblocking-linkless", null, null, {
      imageAssetId: asset.id,
    });

    expect(await getAssetUsage(asset.id)).toBe(0);
    await request(app.getHttpServer())
      .patch(`/api/admin/file-assets/${asset.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(200);
  });

  it("hides public stores for inactive tenants and restores them with the tenant", async () => {
    const tenant = await createTenant("public-store");
    const store = await createStore("public-store", tenant.id);

    await request(app.getHttpServer())
      .patch(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: false })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get("/api/public/stores")
      .query({ search: store.name, limit: 100 })
      .expect(200);
    expect(list.body.some((item: { id: string }) => item.id === store.id)).toBe(
      false,
    );
    await request(app.getHttpServer())
      .get(`/api/public/stores/${store.id}`)
      .expect(404);
    const search = await request(app.getHttpServer())
      .get("/api/public/stores/search")
      .query({ query: store.slug })
      .expect(200);
    expect(
      search.body.some((item: { id: string }) => item.id === store.id),
    ).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.SUPER_ADMIN}`)
      .send({ isActive: true })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/public/stores/${store.id}`)
      .expect(200);
  });

  it("rejects tenant-inconsistent promotions from public projection", async () => {
    const tenant = await createTenant("public-mismatch-store");
    const otherTenant = await createTenant("public-mismatch-promotion");
    const store = await createStore("public-mismatch", tenant.id);
    const promotion = await createPromotion(
      "public-mismatch",
      store.id,
      otherTenant.id,
    );

    await request(app.getHttpServer())
      .get(`/api/public/promotions/${promotion.slug}`)
      .expect(404);
    const list = await request(app.getHttpServer())
      .get("/api/public/promotions")
      .query({ storeId: store.id, limit: 100 })
      .expect(200);
    expect(
      list.body.some((item: { id: string }) => item.id === promotion.id),
    ).toBe(false);
  });

  it("enforces Store/Tenant lifecycle role permissions", async () => {
    const tenant = await createTenant("roles");
    const store = await createStore("roles", tenant.id);

    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.ADS_MANAGER}`)
      .send({ isVisible: false })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/admin/tenants/${tenant.id}`)
      .set("Authorization", `Bearer ${tokens.ADS_MANAGER}`)
      .send({ isActive: false })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.ANALYTICS_VIEWER}`)
      .send({ isVisible: false })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/admin/stores/${store.id}`)
      .set("Authorization", `Bearer ${tokens.CONTENT_MANAGER}`)
      .send({ isVisible: false })
      .expect(200);
  });
});
