import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AdPlacement, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("AdSlots admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "ad-slots-e2e-" + runId;
  const password = "AdSlotsE2e12345!";
  const createdRoleIds: string[] = [];
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  let firstPanelId: string;
  let secondPanelId: string;
  let baselineSlotId: string;
  let listInactiveId: string;
  let listNeedleAlphaId: string;
  let listNeedleBetaId: string;
  let campaignId: string;
  let creativeId: string;

  const slotsUrl = "/api/admin/ad-slots";
  const slotUrl = (id: string) => slotsUrl + "/" + id;
  const auth = (token: string) => ({ Authorization: "Bearer " + token });

  const buildSlot = (overrides: Record<string, unknown> = {}) => ({
    code: prefix + "-api-slot",
    name: prefix + " API slot",
    description: "Isolated advertising slot created by the AdSlot e2e suite.",
    placement: AdPlacement.HOME_PANEL_BANNER,
    panelId: firstPanelId,
    sortOrder: 10,
    isActive: true,
    metadata: { source: "ad-slots-admin-e2e" },
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
        description: "Temporary role created by AdSlot e2e tests",
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
        name: "AdSlot E2E " + label,
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

  async function createSlot(
    suffix: string,
    data: Partial<Prisma.AdSlotUncheckedCreateInput> = {},
  ): Promise<string> {
    const slot = await prisma.adSlot.create({
      data: {
        code: prefix + "-" + suffix,
        name: prefix + " " + suffix,
        placement: AdPlacement.HOME_PANEL_BANNER,
        ...data,
      },
      select: { id: true },
    });

    return slot.id;
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

    const firstPanel = await prisma.panel.create({
      data: {
        code: prefix + "-panel-one",
        name: prefix + " Panel One",
        location: { internalCoordinate: [10, 20, 30] },
        appVersion: "e2e-private-version",
        isActive: true,
      },
      select: { id: true },
    });
    firstPanelId = firstPanel.id;

    const secondPanel = await prisma.panel.create({
      data: {
        code: prefix + "-panel-two",
        name: prefix + " Panel Two",
        isActive: false,
      },
      select: { id: true },
    });
    secondPanelId = secondPanel.id;

    baselineSlotId = await createSlot("baseline", {
      description: "Safe projection baseline",
      panelId: firstPanelId,
      sortOrder: 20,
      metadata: { internalDisplayConfig: true },
      createdById: userIds["ads-manager"],
      updatedById: userIds["ads-manager"],
    });

    listInactiveId = await createSlot("list-inactive", {
      name: "A " + prefix + " list-scope inactive",
      placement: AdPlacement.STORE_CARD_BANNER,
      panelId: firstPanelId,
      sortOrder: 1,
      isActive: false,
    });
    listNeedleAlphaId = await createSlot("list-needle-alpha", {
      name: "B " + prefix + " list-scope needle",
      description: "First searchable needle description",
      placement: AdPlacement.HOME_PANEL_BANNER,
      panelId: null,
      sortOrder: 5,
      isActive: true,
    });
    listNeedleBetaId = await createSlot("list-needle-beta", {
      name: "C " + prefix + " list-scope needle",
      description: "Second searchable needle description",
      placement: AdPlacement.HOME_PANEL_BANNER,
      panelId: secondPanelId,
      sortOrder: 5,
      isActive: true,
    });
    await createSlot("list-deleted", {
      name: "0 " + prefix + " list-scope deleted",
      sortOrder: 0,
      isActive: false,
      deletedAt: new Date(),
    });

    const campaign = await prisma.adCampaign.create({
      data: {
        name: prefix + " regression campaign",
        placement: AdPlacement.MOBILE_HOME_BANNER,
        createdById: userIds["ads-manager"],
        updatedById: userIds["ads-manager"],
      },
      select: { id: true },
    });
    campaignId = campaign.id;

    const creative = await prisma.adCreative.create({
      data: {
        campaignId,
        title: prefix + " regression creative",
        isActive: false,
        createdById: userIds["ads-manager"],
        updatedById: userIds["ads-manager"],
      },
      select: { id: true },
    });
    creativeId = creative.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.analyticsEvent.deleteMany({
          where: {
            campaign: {
              name: { startsWith: prefix },
            },
          },
        });
        await prisma.adSlot.deleteMany({
          where: { code: { startsWith: prefix } },
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
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
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
          prisma.adSlot.count({
            where: { code: { startsWith: prefix } },
          }),
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
          prisma.panel.count({
            where: { code: { startsWith: prefix } },
          }),
          prisma.user.count({
            where: { email: { startsWith: prefix } },
          }),
          prisma.role.count({
            where: { name: { startsWith: prefix } },
          }),
        ]);

        expect(leftovers).toEqual([0, 0, 0, 0, 0, 0]);
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("returns 401 without JWT for every endpoint", async () => {
    await request(app.getHttpServer()).get(slotsUrl).expect(401);
    await request(app.getHttpServer()).get(slotUrl(baselineSlotId)).expect(401);
    await request(app.getHttpServer())
      .post(slotsUrl)
      .send(buildSlot())
      .expect(401);
    await request(app.getHttpServer())
      .patch(slotUrl(baselineSlotId))
      .send({ name: "Unauthorized" })
      .expect(401);
    await request(app.getHttpServer())
      .delete(slotUrl(baselineSlotId))
      .expect(401);
  });

  it.each([
    ["SUPER_ADMIN", "super-admin"],
    ["MALL_ADMIN", "mall-admin"],
    ["ADS_MANAGER", "ads-manager"],
  ])("allows %s to read and write slots", async (_role, label) => {
    const token = tokens[label];

    await request(app.getHttpServer())
      .get(slotsUrl)
      .set(auth(token))
      .expect(200);
    await request(app.getHttpServer())
      .get(slotUrl(baselineSlotId))
      .set(auth(token))
      .expect(200);

    const created = await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(token))
      .send(
        buildSlot({
          code: prefix + "-role-" + label,
          name: prefix + " role slot " + label,
        }),
      )
      .expect(201);
    expect(created.body.createdById).toBe(userIds[label]);

    await request(app.getHttpServer())
      .patch(slotUrl(created.body.id as string))
      .set(auth(token))
      .send({ name: prefix + " role slot patched " + label })
      .expect(200);
    await request(app.getHttpServer())
      .delete(slotUrl(created.body.id as string))
      .set(auth(token))
      .expect(200);
  });

  it.each([
    ["CONTENT_MANAGER", "content-manager"],
    ["ANALYTICS_VIEWER", "analytics-viewer"],
  ])("returns 403 for %s on every endpoint", async (_role, label) => {
    const token = tokens[label];

    await request(app.getHttpServer())
      .get(slotsUrl)
      .set(auth(token))
      .expect(403);
    await request(app.getHttpServer())
      .get(slotUrl(baselineSlotId))
      .set(auth(token))
      .expect(403);
    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(token))
      .send(buildSlot({ code: prefix + "-forbidden-" + label }))
      .expect(403);
    await request(app.getHttpServer())
      .patch(slotUrl(baselineSlotId))
      .set(auth(token))
      .send({ name: "Forbidden" })
      .expect(403);
    await request(app.getHttpServer())
      .delete(slotUrl(baselineSlotId))
      .set(auth(token))
      .expect(403);
  });

  it("creates a normalized global slot with defaults and JWT audit fields", async () => {
    const response = await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({
        code: "  " + prefix.toUpperCase() + "-GLOBAL-MAIN  ",
        name: "  " + prefix + " Global Main  ",
        description: "  Global slot description  ",
        placement: AdPlacement.MOBILE_HOME_BANNER,
        panelId: null,
        metadata: { renderer: "mobile" },
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        code: prefix + "-global-main",
        name: prefix + " Global Main",
        description: "Global slot description",
        placement: AdPlacement.MOBILE_HOME_BANNER,
        panelId: null,
        panel: null,
        sortOrder: 0,
        isActive: true,
        metadata: { renderer: "mobile" },
        deletedAt: null,
        createdById: userIds["ads-manager"],
        updatedById: userIds["ads-manager"],
      }),
    );
  });

  it("creates a panel-specific slot and accepts an inactive existing Panel", async () => {
    const response = await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(
        buildSlot({
          code: prefix + "-inactive-panel-binding",
          name: prefix + " inactive panel binding",
          panelId: secondPanelId,
        }),
      )
      .expect(201);

    expect(response.body.panelId).toBe(secondPanelId);
    expect(response.body.panel).toEqual(
      expect.objectContaining({
        id: secondPanelId,
        code: prefix + "-panel-two",
        name: prefix + " Panel Two",
      }),
    );
  });

  it("returns 404 for a missing Panel reference", async () => {
    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(
        buildSlot({
          code: prefix + "-missing-panel",
          panelId: "missing-panel-" + runId,
        }),
      )
      .expect(404);
  });

  it("reserves normalized codes, including codes of soft-deleted slots", async () => {
    const code = prefix + "-reserved-code";
    const created = await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(buildSlot({ code }))
      .expect(201);

    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(buildSlot({ code: "  " + code.toUpperCase() + "  " }))
      .expect(409);

    await request(app.getHttpServer())
      .delete(slotUrl(created.body.id as string))
      .set(auth(tokens["ads-manager"]))
      .expect(200);

    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(buildSlot({ code }))
      .expect(409);
  });

  it.each([
    ["contains spaces", "invalid code"],
    ["contains underscore", "invalid_code"],
    ["starts with hyphen", "-invalid-code"],
    ["ends with hyphen", "invalid-code-"],
    ["contains consecutive hyphens", "invalid--code"],
  ])("rejects code that %s", async (_case, code) => {
    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(buildSlot({ code }))
      .expect(400);
  });

  it("validates placement, sortOrder, non-null fields and protected body fields", async () => {
    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(buildSlot({ code: prefix + "-invalid-placement", placement: "TV" }))
      .expect(400);

    for (const sortOrder of [-1, 1_000_001, 1.5, null]) {
      await request(app.getHttpServer())
        .post(slotsUrl)
        .set(auth(tokens["ads-manager"]))
        .send(
          buildSlot({
            code: prefix + "-invalid-sort-" + String(sortOrder),
            sortOrder,
          }),
        )
        .expect(400);
    }

    for (const field of [
      "code",
      "name",
      "placement",
      "sortOrder",
      "isActive",
    ]) {
      await request(app.getHttpServer())
        .patch(slotUrl(baselineSlotId))
        .set(auth(tokens["ads-manager"]))
        .send({ [field]: null })
        .expect(400);
    }

    await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({
        ...buildSlot({ code: prefix + "-forbidden-audit-create" }),
        createdById: userIds["mall-admin"],
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(slotUrl(baselineSlotId))
      .set(auth(tokens["ads-manager"]))
      .send({
        updatedById: userIds["mall-admin"],
        deletedAt: new Date().toISOString(),
      })
      .expect(400);
  });

  it("lists non-deleted slots with stable sorting, filters and pagination", async () => {
    const list = await request(app.getHttpServer())
      .get(slotsUrl)
      .query({ search: "LIST-SCOPE", page: 1, limit: 10 })
      .set(auth(tokens["ads-manager"]))
      .expect(200);

    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([
      listInactiveId,
      listNeedleAlphaId,
      listNeedleBetaId,
    ]);
    expect(list.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
    });

    const activeHome = await request(app.getHttpServer())
      .get(slotsUrl)
      .query({
        search: "list-scope",
        placement: AdPlacement.HOME_PANEL_BANNER,
        isActive: true,
      })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(
      activeHome.body.items.map((item: { id: string }) => item.id),
    ).toEqual([listNeedleAlphaId, listNeedleBetaId]);

    const byPanel = await request(app.getHttpServer())
      .get(slotsUrl)
      .query({ search: "list-scope", panelId: secondPanelId })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(byPanel.body.items).toHaveLength(1);
    expect(byPanel.body.items[0].id).toBe(listNeedleBetaId);

    const secondPage = await request(app.getHttpServer())
      .get(slotsUrl)
      .query({ search: "list-scope", page: 2, limit: 1 })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(secondPage.body.items[0].id).toBe(listNeedleAlphaId);
    expect(secondPage.body.pagination.totalPages).toBe(3);
  });

  it("returns one slot through an explicit safe admin projection", async () => {
    const response = await request(app.getHttpServer())
      .get(slotUrl(baselineSlotId))
      .set(auth(tokens["mall-admin"]))
      .expect(200);

    expect(response.body.id).toBe(baselineSlotId);
    expect(Object.keys(response.body.panel).sort()).toEqual(
      ["code", "id", "name"].sort(),
    );
    expect(response.body.panel).not.toHaveProperty("location");
    expect(response.body.panel).not.toHaveProperty("appVersion");
    expect(response.body.createdBy).not.toHaveProperty("passwordHash");
    expect(response.body.createdBy).not.toHaveProperty("phone");
    expect(response.body.createdBy).not.toHaveProperty("roleId");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    await request(app.getHttpServer())
      .get(slotUrl("missing-" + runId))
      .set(auth(tokens["mall-admin"]))
      .expect(404);
  });

  it("patches the merged state, preserves omitted fields and supports nullable fields", async () => {
    const created = await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(
        buildSlot({
          code: prefix + "-patch-target",
          name: prefix + " patch target",
          description: "Keep until explicitly cleared",
          sortOrder: 77,
        }),
      )
      .expect(201);
    const id = created.body.id as string;

    const patched = await request(app.getHttpServer())
      .patch(slotUrl(id))
      .set(auth(tokens["mall-admin"]))
      .send({
        code: "  " + prefix.toUpperCase() + "-PATCHED-TARGET  ",
        name: "  " + prefix + " patched target  ",
      })
      .expect(200);

    expect(patched.body).toEqual(
      expect.objectContaining({
        id,
        code: prefix + "-patched-target",
        name: prefix + " patched target",
        description: "Keep until explicitly cleared",
        placement: AdPlacement.HOME_PANEL_BANNER,
        panelId: firstPanelId,
        sortOrder: 77,
        isActive: true,
        createdById: userIds["ads-manager"],
        updatedById: userIds["mall-admin"],
      }),
    );

    const globalDraft = await request(app.getHttpServer())
      .patch(slotUrl(id))
      .set(auth(tokens["ads-manager"]))
      .send({
        description: null,
        panelId: null,
        metadata: null,
        isActive: false,
      })
      .expect(200);
    expect(globalDraft.body).toEqual(
      expect.objectContaining({
        description: null,
        panelId: null,
        panel: null,
        metadata: null,
        isActive: false,
      }),
    );

    const reactivated = await request(app.getHttpServer())
      .patch(slotUrl(id))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: true })
      .expect(200);
    expect(reactivated.body.isActive).toBe(true);
  });

  it("validates updated Panel references and normalized code conflicts", async () => {
    await request(app.getHttpServer())
      .patch(slotUrl(baselineSlotId))
      .set(auth(tokens["ads-manager"]))
      .send({ panelId: "missing-panel-" + runId })
      .expect(404);

    await request(app.getHttpServer())
      .patch(slotUrl(baselineSlotId))
      .set(auth(tokens["ads-manager"]))
      .send({ code: ("  " + prefix + "-LIST-NEEDLE-ALPHA  ").toUpperCase() })
      .expect(409);
  });

  it("soft-deletes without deleting Panel or audit users and rejects repeated access", async () => {
    const created = await request(app.getHttpServer())
      .post(slotsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(
        buildSlot({
          code: prefix + "-soft-delete-target",
          name: prefix + " soft delete target",
        }),
      )
      .expect(201);
    const id = created.body.id as string;

    const removed = await request(app.getHttpServer())
      .delete(slotUrl(id))
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    expect(removed.body).toEqual(
      expect.objectContaining({
        id,
        isActive: false,
        updatedById: userIds["mall-admin"],
      }),
    );
    expect(removed.body.deletedAt).toEqual(expect.any(String));

    const persisted = await prisma.adSlot.findUnique({ where: { id } });
    expect(persisted?.isActive).toBe(false);
    expect(persisted?.deletedAt).toBeInstanceOf(Date);
    expect(await prisma.panel.count({ where: { id: firstPanelId } })).toBe(1);
    expect(
      await prisma.user.count({
        where: { id: { in: [userIds["ads-manager"], userIds["mall-admin"]] } },
      }),
    ).toBe(2);

    await request(app.getHttpServer())
      .get(slotUrl(id))
      .set(auth(tokens["ads-manager"]))
      .expect(404);
    await request(app.getHttpServer())
      .patch(slotUrl(id))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: true })
      .expect(404);
    await request(app.getHttpServer())
      .delete(slotUrl(id))
      .set(auth(tokens["ads-manager"]))
      .expect(404);
  });

  it("keeps existing AdCampaign and AdCreative admin reads working", async () => {
    const campaign = await request(app.getHttpServer())
      .get("/api/admin/ad-campaigns/" + campaignId)
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(campaign.body.id).toBe(campaignId);

    const creative = await request(app.getHttpServer())
      .get("/api/admin/ad-creatives/" + creativeId)
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(creative.body.id).toBe(creativeId);
  });
});
