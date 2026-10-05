import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AdPlacement, AdTargetType } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("AdCampaigns admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "ad-campaigns-e2e-" + runId;
  const password = "AdCampaignsE2e12345!";
  const createdRoleIds: string[] = [];

  let adsManagerToken: string;
  let analyticsToken: string;
  let contentManagerToken: string;
  let mallAdminToken: string;
  let superAdminToken: string;
  let adsManagerUserId: string;
  let mallAdminUserId: string;

  let activeTenantId: string;
  let otherTenantId: string;
  let inactiveTenantId: string;
  let activeStoreId: string;
  let otherStoreId: string;
  let inactiveStoreId: string;
  let inactiveTenantStoreId: string;
  let hiddenStoreId: string;
  let activePromotionId: string;
  let inactivePromotionId: string;
  let deletedPromotionId: string;
  let hiddenStorePromotionId: string;
  let campaignId: string;

  const auth = (token: string) => ({
    Authorization: "Bearer " + token,
  });

  const buildStoreCampaign = (overrides: Record<string, unknown> = {}) => ({
    name: prefix + " main store campaign",
    description: "Isolated campaign created by the AdCampaign e2e suite.",
    tenantId: activeTenantId,
    placement: AdPlacement.HOME_PANEL_BANNER,
    targetType: AdTargetType.STORE,
    targetStoreId: activeStoreId,
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    priority: 25,
    impressionLimit: 1000,
    metadata: { source: "ad-campaigns-admin-e2e" },
    ...overrides,
  });

  const buildPromotionCampaign = (
    promotionId: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    name: prefix + " promotion campaign",
    tenantId: activeTenantId,
    placement: AdPlacement.PROMOTIONS_BANNER,
    targetType: AdTargetType.PROMOTION,
    targetPromotionId: promotionId,
    priority: 10,
    isActive: true,
    ...overrides,
  });

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
        description: "Temporary role created by AdCampaign e2e tests",
      },
      select: { id: true },
    });
    createdRoleIds.push(role.id);
    return role.id;
  }

  async function createUserAndLogin(
    roleName: string,
    label: string,
    passwordHash: string,
  ): Promise<{ userId: string; token: string }> {
    const roleId = await ensureRole(roleName);
    const email = prefix + "-" + label + "@greenmall.local";
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "AdCampaign E2E " + label,
        roleId,
        isActive: true,
      },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);

    return {
      userId: user.id,
      token: response.body.accessToken as string,
    };
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
    const passwordHash = await bcrypt.hash(password, 10);

    const adsManager = await createUserAndLogin(
      "ADS_MANAGER",
      "ads-manager",
      passwordHash,
    );
    adsManagerToken = adsManager.token;
    adsManagerUserId = adsManager.userId;

    const analytics = await createUserAndLogin(
      "ANALYTICS_VIEWER",
      "analytics",
      passwordHash,
    );
    analyticsToken = analytics.token;

    const contentManager = await createUserAndLogin(
      "CONTENT_MANAGER",
      "content-manager",
      passwordHash,
    );
    contentManagerToken = contentManager.token;

    const mallAdmin = await createUserAndLogin(
      "MALL_ADMIN",
      "mall-admin",
      passwordHash,
    );
    mallAdminToken = mallAdmin.token;
    mallAdminUserId = mallAdmin.userId;

    const superAdmin = await createUserAndLogin(
      "SUPER_ADMIN",
      "super-admin",
      passwordHash,
    );
    superAdminToken = superAdmin.token;

    const activeTenant = await prisma.tenant.create({
      data: {
        name: prefix + " active tenant",
        isActive: true,
      },
      select: { id: true },
    });
    activeTenantId = activeTenant.id;

    const otherTenant = await prisma.tenant.create({
      data: {
        name: prefix + " other tenant",
        isActive: true,
      },
      select: { id: true },
    });
    otherTenantId = otherTenant.id;

    const inactiveTenant = await prisma.tenant.create({
      data: {
        name: prefix + " inactive tenant",
        isActive: false,
      },
      select: { id: true },
    });
    inactiveTenantId = inactiveTenant.id;

    const activeStore = await prisma.store.create({
      data: {
        tenantId: activeTenantId,
        name: prefix + " active store",
        slug: prefix + "-active-store",
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    activeStoreId = activeStore.id;

    const otherStore = await prisma.store.create({
      data: {
        tenantId: otherTenantId,
        name: prefix + " other store",
        slug: prefix + "-other-store",
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    otherStoreId = otherStore.id;

    const inactiveStore = await prisma.store.create({
      data: {
        tenantId: activeTenantId,
        name: prefix + " inactive store",
        slug: prefix + "-inactive-store",
        isActive: false,
        isVisible: true,
      },
      select: { id: true },
    });
    inactiveStoreId = inactiveStore.id;

    const inactiveTenantStore = await prisma.store.create({
      data: {
        tenantId: inactiveTenantId,
        name: prefix + " inactive tenant store",
        slug: prefix + "-inactive-tenant-store",
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    inactiveTenantStoreId = inactiveTenantStore.id;

    const hiddenStore = await prisma.store.create({
      data: {
        tenantId: activeTenantId,
        name: prefix + " hidden store",
        slug: prefix + "-hidden-store",
        isActive: true,
        isVisible: false,
      },
      select: { id: true },
    });
    hiddenStoreId = hiddenStore.id;

    const activePromotion = await prisma.promotion.create({
      data: {
        title: prefix + " active promotion",
        slug: prefix + "-active-promotion",
        tenantId: activeTenantId,
        storeId: activeStoreId,
        isActive: true,
      },
      select: { id: true },
    });
    activePromotionId = activePromotion.id;

    const inactivePromotion = await prisma.promotion.create({
      data: {
        title: prefix + " inactive promotion",
        slug: prefix + "-inactive-promotion",
        tenantId: activeTenantId,
        storeId: activeStoreId,
        isActive: false,
      },
      select: { id: true },
    });
    inactivePromotionId = inactivePromotion.id;

    const deletedPromotion = await prisma.promotion.create({
      data: {
        title: prefix + " deleted promotion",
        slug: prefix + "-deleted-promotion",
        tenantId: activeTenantId,
        storeId: activeStoreId,
        isActive: false,
        deletedAt: new Date(),
      },
      select: { id: true },
    });
    deletedPromotionId = deletedPromotion.id;

    const hiddenStorePromotion = await prisma.promotion.create({
      data: {
        title: prefix + " hidden-store promotion",
        slug: prefix + "-hidden-store-promotion",
        tenantId: activeTenantId,
        storeId: hiddenStoreId,
        isActive: true,
      },
      select: { id: true },
    });
    hiddenStorePromotionId = hiddenStorePromotion.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.adCreative.deleteMany({
          where: {
            campaign: {
              name: { startsWith: prefix },
            },
          },
        });
        await prisma.adCampaign.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.promotion.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.store.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.tenant.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.user.deleteMany({
          where: { email: { startsWith: prefix } },
        });

        if (createdRoleIds.length > 0) {
          await prisma.role.deleteMany({
            where: { id: { in: createdRoleIds } },
          });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("rejects requests without JWT", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .expect(401);
  });

  it("rejects CONTENT_MANAGER access", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .set(auth(contentManagerToken))
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(contentManagerToken))
      .send(buildStoreCampaign())
      .expect(403);
  });

  it("rejects ANALYTICS_VIEWER access to campaign reads and writes", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .set(auth(analyticsToken))
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(analyticsToken))
      .send(buildStoreCampaign())
      .expect(403);

    await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/non-existent")
      .set(auth(analyticsToken))
      .send({ name: "Forbidden update" })
      .expect(403);

    await request(app.getHttpServer())
      .delete("/api/admin/ad-campaigns/non-existent")
      .set(auth(analyticsToken))
      .expect(403);
  });

  it("allows ADS_MANAGER to create a STORE campaign with JWT audit fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(buildStoreCampaign({ isActive: undefined }))
      .expect(201);

    campaignId = response.body.id as string;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: campaignId,
        tenantId: activeTenantId,
        placement: AdPlacement.HOME_PANEL_BANNER,
        targetType: AdTargetType.STORE,
        targetStoreId: activeStoreId,
        isActive: true,
        createdById: adsManagerUserId,
        updatedById: adsManagerUserId,
        deletedAt: null,
        creativesCount: 0,
      }),
    );
  });

  it("allows ADS_MANAGER to read filtered campaigns and one campaign", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .query({
        search: prefix,
        tenantId: activeTenantId,
        placement: AdPlacement.HOME_PANEL_BANNER,
        targetType: AdTargetType.STORE,
        isActive: true,
        startsFrom: new Date(Date.now() - 3_600_000).toISOString(),
        startsTo: new Date(Date.now() + 3_600_000).toISOString(),
        page: 1,
        limit: 10,
      })
      .expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: campaignId,
          targetStoreId: activeStoreId,
        }),
      ]),
    );
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });

    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .expect(200);
  });

  it("allows MALL_ADMIN to read one campaign with safe relations", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(mallAdminToken))
      .expect(200);

    expect(response.body.tenant).toEqual(
      expect.objectContaining({ id: activeTenantId, isActive: true }),
    );
    expect(response.body.targetStore).toEqual(
      expect.objectContaining({ id: activeStoreId }),
    );
    expect(response.body.createdBy).toEqual(
      expect.objectContaining({ id: adsManagerUserId }),
    );
    expect(response.body.creativesCount).toBe(0);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("allows SUPER_ADMIN to read the campaign list and one campaign", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .set(auth(superAdminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(superAdminToken))
      .expect(200);
  });

  it("allows partial updates and records updatedById from the new actor", async () => {
    const response = await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(mallAdminToken))
      .send({
        name: prefix + " updated main campaign",
        priority: 50,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: campaignId,
        name: prefix + " updated main campaign",
        priority: 50,
        createdById: adsManagerUserId,
        updatedById: mallAdminUserId,
      }),
    );
  });

  it("supports deactivation and fully validated reactivation before soft delete", async () => {
    const deactivated = await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .send({ isActive: false })
      .expect(200);
    expect(deactivated.body.isActive).toBe(false);

    const reactivated = await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .send({ isActive: true })
      .expect(200);
    expect(reactivated.body.isActive).toBe(true);
  });

  it.each(["name", "placement", "targetType", "priority", "isActive"])(
    "rejects PATCH when %s is explicitly null",
    async (field) => {
      await request(app.getHttpServer())
        .patch("/api/admin/ad-campaigns/" + campaignId)
        .set(auth(adsManagerToken))
        .send({ [field]: null })
        .expect(400);
    },
  );

  it.each(["targetType", "priority", "isActive"])(
    "rejects POST when %s is explicitly null",
    async (field) => {
      await request(app.getHttpServer())
        .post("/api/admin/ad-campaigns")
        .set(auth(adsManagerToken))
        .send({
          name: prefix + " explicit null " + field,
          placement: AdPlacement.MOBILE_HOME_BANNER,
          [field]: null,
        })
        .expect(400);
    },
  );

  it("keeps explicit null support for nullable PATCH fields", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send({
        name: prefix + " nullable fields campaign",
        description: "Nullable field fixture",
        tenantId: activeTenantId,
        placement: AdPlacement.MOBILE_HOME_BANNER,
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 3_600_000).toISOString(),
        impressionLimit: 100,
        metadata: { nullable: false },
      })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        targetType: AdTargetType.NONE,
        priority: 0,
        isActive: true,
      }),
    );

    const updated = await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + (created.body.id as string))
      .set(auth(adsManagerToken))
      .send({
        description: null,
        tenantId: null,
        targetStoreId: null,
        targetPromotionId: null,
        targetUrl: null,
        startsAt: null,
        endsAt: null,
        impressionLimit: null,
        metadata: null,
      })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        description: null,
        tenantId: null,
        targetStoreId: null,
        targetPromotionId: null,
        targetUrl: null,
        startsAt: null,
        endsAt: null,
        impressionLimit: null,
        metadata: null,
        targetType: AdTargetType.NONE,
        priority: 0,
        isActive: true,
      }),
    );
  });

  it("validates mutually exclusive target fields", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " store target missing id",
          targetStoreId: null,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " multiple targets",
          targetPromotionId: activePromotionId,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send({
        name: prefix + " promotion missing id",
        tenantId: activeTenantId,
        placement: AdPlacement.PROMOTIONS_BANNER,
        targetType: AdTargetType.PROMOTION,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send({
        name: prefix + " unsafe url",
        placement: AdPlacement.MOBILE_HOME_BANNER,
        targetType: AdTargetType.URL,
        targetUrl: "javascript:alert(1)",
      })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send({
        name: prefix + " none with target",
        placement: AdPlacement.MOBILE_HOME_BANNER,
        targetType: AdTargetType.NONE,
        targetUrl: "https://example.test/forbidden",
      })
      .expect(400);
  });

  it("returns 404 for missing tenant and store references", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " missing tenant",
          tenantId: "missing-tenant-" + runId,
        }),
      )
      .expect(404);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " missing store",
          targetStoreId: "missing-store-" + runId,
        }),
      )
      .expect(404);
  });

  it("rejects mismatched or inactive STORE dependencies with 409", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " mismatched tenant",
          tenantId: otherTenantId,
          targetStoreId: activeStoreId,
        }),
      )
      .expect(409);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " inactive store",
          targetStoreId: inactiveStoreId,
        }),
      )
      .expect(409);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " inactive tenant",
          tenantId: inactiveTenantId,
          targetStoreId: inactiveTenantStoreId,
        }),
      )
      .expect(409);

    expect(otherStoreId).toBeDefined();
  });

  it("validates PROMOTION targets and their lifecycle dependencies", async () => {
    const validResponse = await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(buildPromotionCampaign(activePromotionId))
      .expect(201);

    expect(validResponse.body).toEqual(
      expect.objectContaining({
        targetType: AdTargetType.PROMOTION,
        targetPromotionId: activePromotionId,
      }),
    );

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildPromotionCampaign(deletedPromotionId, {
          name: prefix + " deleted promotion target",
        }),
      )
      .expect(404);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildPromotionCampaign(inactivePromotionId, {
          name: prefix + " inactive promotion target",
        }),
      )
      .expect(409);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildPromotionCampaign(hiddenStorePromotionId, {
          name: prefix + " hidden store promotion target",
        }),
      )
      .expect(409);
  });

  it("rejects invalid date ranges, priorities and impression limits", async () => {
    const sameDate = new Date().toISOString();

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " invalid date range",
          startsAt: sameDate,
          endsAt: sameDate,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " zero impression limit",
          impressionLimit: 0,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " negative impression limit",
          impressionLimit: -1,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .send(
        buildStoreCampaign({
          name: prefix + " negative priority",
          priority: -1,
        }),
      )
      .expect(400);
  });

  it("validates the final merged target state during PATCH", async () => {
    await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .send({ targetType: AdTargetType.NONE })
      .expect(400);

    const stored = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { targetType: true, targetStoreId: true },
    });
    expect(stored).toEqual({
      targetType: AdTargetType.STORE,
      targetStoreId: activeStoreId,
    });
  });

  it("returns 403 to ANALYTICS_VIEWER for both campaign read endpoints", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .set(auth(analyticsToken))
      .expect(403);

    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(analyticsToken))
      .expect(403);

    await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(analyticsToken))
      .send({ name: "Forbidden" })
      .expect(403);

    await request(app.getHttpServer())
      .delete("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(analyticsToken))
      .expect(403);
  });

  it("soft-deletes a campaign and hides it from normal admin reads", async () => {
    const response = await request(app.getHttpServer())
      .delete("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(mallAdminToken))
      .expect(200);

    expect(response.body.isActive).toBe(false);
    expect(response.body.deletedAt).toEqual(expect.any(String));
    expect(response.body.updatedById).toBe(mallAdminUserId);

    const persisted = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, isActive: true, deletedAt: true },
    });
    expect(persisted).toEqual(
      expect.objectContaining({
        id: campaignId,
        isActive: false,
        deletedAt: expect.any(Date),
      }),
    );

    const listResponse = await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns")
      .set(auth(adsManagerToken))
      .query({ search: prefix + " updated main campaign" })
      .expect(200);
    expect(listResponse.body.items).toEqual([]);

    await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .expect(404);
  });

  it("rejects PATCH and repeated DELETE for a soft-deleted campaign", async () => {
    await request(app.getHttpServer())
      .patch("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .send({ isActive: true })
      .expect(404);

    await request(app.getHttpServer())
      .delete("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(adsManagerToken))
      .expect(404);
  });
});
