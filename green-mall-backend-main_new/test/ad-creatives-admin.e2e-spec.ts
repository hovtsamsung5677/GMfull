import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AdPlacement, FileAssetKind, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("AdCreatives admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "ad-creatives-e2e-" + runId;
  const password = "AdCreativesE2e12345!";
  const createdRoleIds: string[] = [];

  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  let activeCampaignId: string;
  let inactiveCampaignId: string;
  let deletedCampaignId: string;
  let listCampaignId: string;
  let activeImageId: string;
  let secondActiveImageId: string;
  let inactiveImageId: string;
  let videoAssetId: string;
  let baselineCreativeId: string;
  let listInactiveId: string;
  let listNeedleNewId: string;
  let listNeedleOldId: string;

  const auth = (token: string) => ({
    Authorization: "Bearer " + token,
  });

  const creativeUrl = (id: string) => "/api/admin/ad-creatives/" + id;
  const campaignCreativesUrl = (campaignId: string) =>
    "/api/admin/ad-campaigns/" + campaignId + "/creatives";

  const buildActiveCreative = (overrides: Record<string, unknown> = {}) => ({
    assetId: activeImageId,
    title: prefix + " active creative",
    description: "Isolated creative created by the AdCreative e2e suite.",
    altText: "Advertising banner",
    ctaText: "Open",
    metadata: { source: "ad-creatives-admin-e2e" },
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
        description: "Temporary role created by AdCreative e2e tests",
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
  ): Promise<void> {
    const roleId = await ensureRole(roleName);
    const email = prefix + "-" + label + "@greenmall.local";
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "AdCreative E2E " + label,
        roleId,
        isActive: true,
      },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);

    tokens[label] = response.body.accessToken as string;
    userIds[label] = user.id;
  }

  async function createCampaign(
    label: string,
    data: { isActive?: boolean; deletedAt?: Date | null } = {},
  ): Promise<string> {
    const campaign = await prisma.adCampaign.create({
      data: {
        name: prefix + " " + label,
        placement: AdPlacement.HOME_PANEL_BANNER,
        isActive: data.isActive ?? true,
        deletedAt: data.deletedAt,
      },
      select: { id: true },
    });

    return campaign.id;
  }

  async function createCreative(
    campaignId: string,
    data: {
      assetId?: string | null;
      title?: string | null;
      description?: string | null;
      altText?: string | null;
      ctaText?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      metadata?: Prisma.InputJsonValue;
      deletedAt?: Date | null;
      createdAt?: Date;
      createdById?: string;
      updatedById?: string;
    } = {},
  ): Promise<string> {
    const creative = await prisma.adCreative.create({
      data: {
        campaignId,
        assetId: data.assetId === undefined ? activeImageId : data.assetId,
        title: data.title ?? prefix + " direct creative",
        description: data.description,
        altText: data.altText,
        ctaText: data.ctaText,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        metadata: data.metadata,
        deletedAt: data.deletedAt,
        createdAt: data.createdAt,
        createdById: data.createdById,
        updatedById: data.updatedById,
      },
      select: { id: true },
    });

    return creative.id;
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

    await createUserAndLogin("SUPER_ADMIN", "super-admin", passwordHash);
    await createUserAndLogin("MALL_ADMIN", "mall-admin", passwordHash);
    await createUserAndLogin("ADS_MANAGER", "ads-manager", passwordHash);
    await createUserAndLogin(
      "CONTENT_MANAGER",
      "content-manager",
      passwordHash,
    );
    await createUserAndLogin(
      "ANALYTICS_VIEWER",
      "analytics-viewer",
      passwordHash,
    );
    await createUserAndLogin(prefix + "-NO_ACCESS", "no-access", passwordHash);

    const activeImage = await prisma.fileAsset.create({
      data: {
        filename: prefix + "-active-image",
        originalName: "active-image.png",
        mimeType: "image/png",
        url: "https://cdn.example.test/" + prefix + "/active-image.png",
        path: "/private/" + prefix + "/active-image.png",
        provider: "e2e-internal-provider",
        kind: FileAssetKind.IMAGE,
        isActive: true,
        metadata: { internalAssetFlag: true },
        uploadedById: userIds["ads-manager"],
      },
      select: { id: true },
    });
    activeImageId = activeImage.id;

    const secondActiveImage = await prisma.fileAsset.create({
      data: {
        filename: prefix + "-second-active-image",
        url: "https://cdn.example.test/" + prefix + "/second-image.png",
        kind: FileAssetKind.IMAGE,
        isActive: true,
      },
      select: { id: true },
    });
    secondActiveImageId = secondActiveImage.id;

    const inactiveImage = await prisma.fileAsset.create({
      data: {
        filename: prefix + "-inactive-image",
        url: "https://cdn.example.test/" + prefix + "/inactive-image.png",
        kind: FileAssetKind.IMAGE,
        isActive: false,
      },
      select: { id: true },
    });
    inactiveImageId = inactiveImage.id;

    const videoAsset = await prisma.fileAsset.create({
      data: {
        filename: prefix + "-video",
        url: "https://cdn.example.test/" + prefix + "/video.mp4",
        kind: FileAssetKind.VIDEO,
        isActive: true,
      },
      select: { id: true },
    });
    videoAssetId = videoAsset.id;

    activeCampaignId = await createCampaign("active campaign");
    inactiveCampaignId = await createCampaign("inactive campaign", {
      isActive: false,
    });
    deletedCampaignId = await createCampaign("deleted campaign", {
      isActive: false,
      deletedAt: new Date(),
    });
    listCampaignId = await createCampaign("list campaign");

    baselineCreativeId = await createCreative(activeCampaignId, {
      title: prefix + " baseline",
      description: "Baseline safe projection creative",
      altText: "Baseline alt",
      ctaText: "Baseline CTA",
      metadata: { publicCreativeMetadata: true },
      createdById: userIds["ads-manager"],
      updatedById: userIds["ads-manager"],
    });

    listInactiveId = await createCreative(listCampaignId, {
      assetId: inactiveImageId,
      title: prefix + " list inactive",
      isActive: false,
      sortOrder: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    listNeedleOldId = await createCreative(listCampaignId, {
      title: prefix + " needle old",
      isActive: true,
      sortOrder: 5,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    listNeedleNewId = await createCreative(listCampaignId, {
      assetId: secondActiveImageId,
      title: prefix + " needle new",
      isActive: true,
      sortOrder: 5,
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
    });
    await createCreative(listCampaignId, {
      title: prefix + " deleted list creative",
      isActive: false,
      sortOrder: 0,
      deletedAt: new Date(),
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.analyticsEvent.deleteMany({
          where: {
            creative: {
              campaign: {
                name: { startsWith: prefix },
              },
            },
          },
        });
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
        await prisma.fileAsset.deleteMany({
          where: { filename: { startsWith: prefix } },
        });
        await prisma.user.deleteMany({
          where: { email: { startsWith: prefix } },
        });

        if (createdRoleIds.length > 0) {
          await prisma.role.deleteMany({
            where: { id: { in: createdRoleIds } },
          });
        }

        const leftovers = await Promise.all([
          prisma.adCreative.count({
            where: {
              campaign: {
                name: { startsWith: prefix },
              },
            },
          }),
          prisma.adCampaign.count({
            where: { name: { startsWith: prefix } },
          }),
          prisma.fileAsset.count({
            where: { filename: { startsWith: prefix } },
          }),
          prisma.user.count({
            where: { email: { startsWith: prefix } },
          }),
          prisma.role.count({
            where: { name: { startsWith: prefix } },
          }),
        ]);

        expect(leftovers).toEqual([0, 0, 0, 0, 0]);
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("rejects admin requests without JWT", async () => {
    await request(app.getHttpServer())
      .get(campaignCreativesUrl(activeCampaignId))
      .expect(401);
    await request(app.getHttpServer())
      .get(creativeUrl(baselineCreativeId))
      .expect(401);
  });

  it.each([
    ["SUPER_ADMIN", "super-admin"],
    ["MALL_ADMIN", "mall-admin"],
    ["ADS_MANAGER", "ads-manager"],
    ["CONTENT_MANAGER", "content-manager"],
  ])("allows %s to read and write creatives", async (_role, label) => {
    await request(app.getHttpServer())
      .get(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens[label]))
      .expect(200);

    await request(app.getHttpServer())
      .get(creativeUrl(baselineCreativeId))
      .set(auth(tokens[label]))
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens[label]))
      .send(
        buildActiveCreative({
          title: prefix + " role write " + label,
        }),
      )
      .expect(201);

    expect(response.body.createdById).toBe(userIds[label]);
  });

  it.each([
    ["ANALYTICS_VIEWER", "analytics-viewer"],
    ["an unlisted role", "no-access"],
  ])("returns 403 for %s on every creative endpoint", async (_role, label) => {
    const token = tokens[label];

    await request(app.getHttpServer())
      .get(campaignCreativesUrl(activeCampaignId))
      .set(auth(token))
      .expect(403);
    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(token))
      .send(buildActiveCreative())
      .expect(403);
    await request(app.getHttpServer())
      .get(creativeUrl(baselineCreativeId))
      .set(auth(token))
      .expect(403);
    await request(app.getHttpServer())
      .patch(creativeUrl(baselineCreativeId))
      .set(auth(token))
      .send({ title: prefix + " forbidden update" })
      .expect(403);
    await request(app.getHttpServer())
      .delete(creativeUrl(baselineCreativeId))
      .set(auth(token))
      .expect(403);
  });

  it("creates an active creative with Prisma defaults and JWT audit fields", async () => {
    const response = await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(
        buildActiveCreative({
          title: "  " + prefix + " created through API  ",
        }),
      )
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        campaignId: activeCampaignId,
        assetId: activeImageId,
        title: prefix + " created through API",
        isActive: true,
        sortOrder: 0,
        createdById: userIds["ads-manager"],
        updatedById: userIds["ads-manager"],
      }),
    );

    const persisted = await prisma.adCreative.findUnique({
      where: { id: response.body.id as string },
    });
    expect(persisted?.campaignId).toBe(activeCampaignId);
    expect(persisted?.createdById).toBe(userIds["ads-manager"]);
  });

  it("rejects campaign and audit fields supplied in request bodies", async () => {
    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send({
        ...buildActiveCreative(),
        campaignId: inactiveCampaignId,
        createdById: userIds["mall-admin"],
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(creativeUrl(baselineCreativeId))
      .set(auth(tokens["ads-manager"]))
      .send({
        updatedById: userIds["mall-admin"],
        deletedAt: new Date().toISOString(),
      })
      .expect(400);
  });

  it("supports inactive drafts and preparation inside an inactive campaign", async () => {
    const draft = await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["content-manager"]))
      .send({
        title: prefix + " assetless draft",
        assetId: null,
        isActive: false,
      })
      .expect(201);

    expect(draft.body.assetId).toBeNull();
    expect(draft.body.asset).toBeNull();
    expect(draft.body.isActive).toBe(false);

    const prepared = await request(app.getHttpServer())
      .post(campaignCreativesUrl(inactiveCampaignId))
      .set(auth(tokens["content-manager"]))
      .send(
        buildActiveCreative({
          title: prefix + " prepared in inactive campaign",
        }),
      )
      .expect(201);

    expect(prepared.body.campaignId).toBe(inactiveCampaignId);
    expect(prepared.body.isActive).toBe(true);
  });

  it("returns 404 for missing or soft-deleted campaigns", async () => {
    const missingCampaignId = "missing-" + runId;

    await request(app.getHttpServer())
      .get(campaignCreativesUrl(missingCampaignId))
      .set(auth(tokens["ads-manager"]))
      .expect(404);
    await request(app.getHttpServer())
      .post(campaignCreativesUrl(missingCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(buildActiveCreative())
      .expect(404);
    await request(app.getHttpServer())
      .get(campaignCreativesUrl(deletedCampaignId))
      .set(auth(tokens["ads-manager"]))
      .expect(404);
    await request(app.getHttpServer())
      .post(campaignCreativesUrl(deletedCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(buildActiveCreative())
      .expect(404);
  });

  it("enforces FileAsset existence, IMAGE kind and active-state rules", async () => {
    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(buildActiveCreative({ assetId: "missing-" + runId }))
      .expect(404);

    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(buildActiveCreative({ assetId: videoAssetId }))
      .expect(400);

    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(
        buildActiveCreative({
          assetId: videoAssetId,
          isActive: false,
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send({ title: prefix + " active without asset" })
      .expect(400);

    await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(buildActiveCreative({ assetId: inactiveImageId }))
      .expect(409);

    const inactiveWithInactiveImage = await request(app.getHttpServer())
      .post(campaignCreativesUrl(activeCampaignId))
      .set(auth(tokens["ads-manager"]))
      .send(
        buildActiveCreative({
          assetId: inactiveImageId,
          isActive: false,
          title: prefix + " inactive creative with inactive image",
        }),
      )
      .expect(201);

    expect(inactiveWithInactiveImage.body.assetId).toBe(inactiveImageId);
    expect(inactiveWithInactiveImage.body.isActive).toBe(false);
  });

  it("lists only non-deleted campaign creatives with filters and stable sorting", async () => {
    const list = await request(app.getHttpServer())
      .get(campaignCreativesUrl(listCampaignId))
      .query({ page: 1, limit: 10 })
      .set(auth(tokens["ads-manager"]))
      .expect(200);

    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([
      listInactiveId,
      listNeedleNewId,
      listNeedleOldId,
    ]);
    expect(list.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
    });

    const search = await request(app.getHttpServer())
      .get(campaignCreativesUrl(listCampaignId))
      .query({ search: "NEEDLE" })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(search.body.items.map((item: { id: string }) => item.id)).toEqual([
      listNeedleNewId,
      listNeedleOldId,
    ]);

    const inactive = await request(app.getHttpServer())
      .get(campaignCreativesUrl(listCampaignId))
      .query({ isActive: false })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(inactive.body.items).toHaveLength(1);
    expect(inactive.body.items[0].id).toBe(listInactiveId);

    const byAsset = await request(app.getHttpServer())
      .get(campaignCreativesUrl(listCampaignId))
      .query({ assetId: secondActiveImageId })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(byAsset.body.items).toHaveLength(1);
    expect(byAsset.body.items[0].id).toBe(listNeedleNewId);

    const pageTwo = await request(app.getHttpServer())
      .get(campaignCreativesUrl(listCampaignId))
      .query({ page: 2, limit: 1 })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(pageTwo.body.items[0].id).toBe(listNeedleNewId);
    expect(pageTwo.body.pagination.totalPages).toBe(3);
  });

  it("returns one creative through an explicit safe admin projection", async () => {
    const response = await request(app.getHttpServer())
      .get(creativeUrl(baselineCreativeId))
      .set(auth(tokens["mall-admin"]))
      .expect(200);

    expect(response.body.id).toBe(baselineCreativeId);
    expect(Object.keys(response.body.asset).sort()).toEqual(
      [
        "filename",
        "id",
        "isActive",
        "kind",
        "mimeType",
        "originalName",
        "url",
      ].sort(),
    );
    expect(response.body.asset).not.toHaveProperty("path");
    expect(response.body.asset).not.toHaveProperty("provider");
    expect(response.body.asset).not.toHaveProperty("uploadedById");
    expect(response.body.asset).not.toHaveProperty("metadata");
    expect(response.body.campaign).not.toHaveProperty("metadata");
    expect(response.body.createdBy).not.toHaveProperty("passwordHash");
    expect(response.body.updatedBy).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    await request(app.getHttpServer())
      .get(creativeUrl("missing-" + runId))
      .set(auth(tokens["mall-admin"]))
      .expect(404);
  });

  it("patches text and sort order, preserves omitted fields and records JWT audit", async () => {
    const id = await createCreative(activeCampaignId, {
      title: prefix + " patch original",
      description: "Description must be preserved",
      altText: "Alt must be preserved",
      ctaText: "CTA must be preserved",
      sortOrder: 9,
      createdById: userIds["ads-manager"],
      updatedById: userIds["ads-manager"],
    });

    const response = await request(app.getHttpServer())
      .patch(creativeUrl(id))
      .set(auth(tokens["mall-admin"]))
      .send({
        title: "  " + prefix + " patched title  ",
        sortOrder: 42,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id,
        title: prefix + " patched title",
        description: "Description must be preserved",
        altText: "Alt must be preserved",
        ctaText: "CTA must be preserved",
        assetId: activeImageId,
        isActive: true,
        sortOrder: 42,
        createdById: userIds["ads-manager"],
        updatedById: userIds["mall-admin"],
      }),
    );
  });

  it("supports explicit null for nullable PATCH fields and rejects null non-nullables", async () => {
    const id = await createCreative(activeCampaignId, {
      title: prefix + " nullable patch",
      description: "Nullable description",
      altText: "Nullable alt",
      ctaText: "Nullable CTA",
      metadata: { clear: true },
    });

    const response = await request(app.getHttpServer())
      .patch(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .send({
        assetId: null,
        title: null,
        description: null,
        altText: null,
        ctaText: null,
        metadata: null,
        isActive: false,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        assetId: null,
        title: null,
        description: null,
        altText: null,
        ctaText: null,
        metadata: null,
        isActive: false,
      }),
    );

    await request(app.getHttpServer())
      .patch(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .send({ sortOrder: null })
      .expect(400);
    await request(app.getHttpServer())
      .patch(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .send({ isActive: null })
      .expect(400);
  });

  it("validates the final merged PATCH state and permits safe deactivation", async () => {
    const assetlessDraftId = await createCreative(activeCampaignId, {
      assetId: null,
      title: prefix + " merged assetless draft",
      isActive: false,
    });

    await request(app.getHttpServer())
      .patch(creativeUrl(assetlessDraftId))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: true })
      .expect(400);

    const activeId = await createCreative(activeCampaignId, {
      title: prefix + " merged active",
    });
    await request(app.getHttpServer())
      .patch(creativeUrl(activeId))
      .set(auth(tokens["ads-manager"]))
      .send({ assetId: null })
      .expect(400);
    await request(app.getHttpServer())
      .patch(creativeUrl(activeId))
      .set(auth(tokens["ads-manager"]))
      .send({ assetId: videoAssetId })
      .expect(400);
    await request(app.getHttpServer())
      .patch(creativeUrl(activeId))
      .set(auth(tokens["ads-manager"]))
      .send({ assetId: inactiveImageId })
      .expect(409);

    const inactiveAssetDraftId = await createCreative(activeCampaignId, {
      assetId: inactiveImageId,
      title: prefix + " inactive asset draft",
      isActive: false,
    });
    await request(app.getHttpServer())
      .patch(creativeUrl(inactiveAssetDraftId))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: true })
      .expect(409);

    const deactivated = await request(app.getHttpServer())
      .patch(creativeUrl(activeId))
      .set(auth(tokens["ads-manager"]))
      .send({
        assetId: inactiveImageId,
        isActive: false,
      })
      .expect(200);
    expect(deactivated.body.isActive).toBe(false);
    expect(deactivated.body.assetId).toBe(inactiveImageId);
  });

  it("soft-deletes a creative without changing its campaign or FileAsset", async () => {
    const title = prefix + " delete lifecycle";
    const id = await createCreative(activeCampaignId, {
      title,
      createdById: userIds["ads-manager"],
      updatedById: userIds["ads-manager"],
    });

    const deleted = await request(app.getHttpServer())
      .delete(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .expect(200);

    expect(deleted.body.isActive).toBe(false);
    expect(deleted.body.deletedAt).toEqual(expect.any(String));
    expect(deleted.body.updatedById).toBe(userIds["content-manager"]);

    const persisted = await prisma.adCreative.findUnique({ where: { id } });
    expect(persisted?.isActive).toBe(false);
    expect(persisted?.deletedAt).toBeInstanceOf(Date);
    expect(persisted?.updatedById).toBe(userIds["content-manager"]);

    await request(app.getHttpServer())
      .get(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .expect(404);
    const list = await request(app.getHttpServer())
      .get(campaignCreativesUrl(activeCampaignId))
      .query({ search: title })
      .set(auth(tokens["content-manager"]))
      .expect(200);
    expect(list.body.items).toHaveLength(0);
    await request(app.getHttpServer())
      .patch(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .send({ title: prefix + " cannot update deleted" })
      .expect(404);
    await request(app.getHttpServer())
      .delete(creativeUrl(id))
      .set(auth(tokens["content-manager"]))
      .expect(404);

    expect(
      await prisma.adCampaign.findUnique({ where: { id: activeCampaignId } }),
    ).not.toBeNull();
    expect(
      await prisma.fileAsset.findUnique({ where: { id: activeImageId } }),
    ).not.toBeNull();
  });
});
