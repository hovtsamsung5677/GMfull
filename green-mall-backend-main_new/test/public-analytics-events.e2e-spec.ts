import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AdPlacement,
  AnalyticsEventType,
  AnalyticsSource,
  PanelStatus,
  Prisma,
} from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Public visitor/navigation analytics event API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "public-analytics-events-e2e-" + runId;
  const eventsUrl = "/api/public/analytics/events";
  const originalPanelLastSeenAt = new Date("2025-01-02T03:04:05.000Z");
  let sequence = 0;
  let panelId: string;
  let storeId: string;
  let categoryId: string;
  let promotionId: string;

  const unique = (label: string) => label + "-" + ++sequence;
  const clientEventId = (label: string) => prefix + "-" + unique(label);

  function buildEventBody(
    type: AnalyticsEventType,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      clientEventId: clientEventId(type.toLowerCase()),
      type,
      source: AnalyticsSource.MOBILE,
      sessionId: prefix + "-session",
      deviceData: { platform: "e2e" },
      ...overrides,
    };
  }

  function buildSupportedEventBody(
    type: AnalyticsEventType,
  ): Record<string, unknown> {
    switch (type) {
      case AnalyticsEventType.SESSION_RESET:
      case AnalyticsEventType.PANEL_USED:
        return buildEventBody(type, {
          source: AnalyticsSource.PANEL,
          panelId,
        });
      case AnalyticsEventType.SEARCH_QUERY:
        return buildEventBody(type, { query: "  sport shoes  " });
      case AnalyticsEventType.CATEGORY_SELECTED:
        return buildEventBody(type, { categoryId });
      case AnalyticsEventType.STORE_SELECTED:
      case AnalyticsEventType.STORE_CARD_VIEWED:
        return buildEventBody(type, { storeId });
      case AnalyticsEventType.ROUTE_BUILT:
        return buildEventBody(type, {
          payload: { fromNodeId: "entrance", toNodeId: "store-anchor" },
        });
      case AnalyticsEventType.QR_SCANNED:
        return buildEventBody(type, {
          qrToken: prefix + "-qr-token",
          storeId,
        });
      case AnalyticsEventType.PROMOTION_VIEWED:
        return buildEventBody(type, { promotionId });
      case AnalyticsEventType.DATA_LOAD_ERROR:
        return buildEventBody(type, {
          payload: { resource: "map-scene", code: "NETWORK_ERROR" },
        });
      default:
        return buildEventBody(type);
    }
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

    const tenant = await prisma.tenant.create({
      data: {
        name: prefix + " tenant",
        isActive: true,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: prefix + " category",
        slug: prefix + "-category",
        isActive: true,
      },
    });
    const store = await prisma.store.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: prefix + " store",
        slug: prefix + "-store",
        isActive: true,
        isVisible: true,
      },
    });
    const promotion = await prisma.promotion.create({
      data: {
        title: prefix + " promotion",
        slug: prefix + "-promotion",
        tenantId: tenant.id,
        storeId: store.id,
        isActive: true,
      },
    });
    const panel = await prisma.panel.create({
      data: {
        code: prefix + "-panel",
        name: prefix + " panel",
        status: PanelStatus.MAINTENANCE,
        appVersion: "visitor-e2e-original",
        lastSeenAt: originalPanelLastSeenAt,
        isActive: true,
      },
    });

    panelId = panel.id;
    storeId = store.id;
    categoryId = category.id;
    promotionId = promotion.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.analyticsEvent.deleteMany({
          where: { clientEventId: { startsWith: prefix } },
        });
        await prisma.adCampaignAssignment.deleteMany({
          where: {
            OR: [
              { campaign: { name: { startsWith: prefix } } },
              { slot: { code: { startsWith: prefix } } },
            ],
          },
        });
        await prisma.adCreative.deleteMany({
          where: { campaign: { name: { startsWith: prefix } } },
        });
        await prisma.adCampaign.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.adSlot.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.promotion.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.store.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.category.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.tenant.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it.each([
    AnalyticsEventType.SESSION_STARTED,
    AnalyticsEventType.SESSION_ENDED,
    AnalyticsEventType.SESSION_RESET,
    AnalyticsEventType.SEARCH_QUERY,
    AnalyticsEventType.CATEGORY_SELECTED,
    AnalyticsEventType.STORE_SELECTED,
    AnalyticsEventType.STORE_CARD_VIEWED,
    AnalyticsEventType.ROUTE_BUILT,
    AnalyticsEventType.QR_SCANNED,
    AnalyticsEventType.PROMOTION_VIEWED,
    AnalyticsEventType.MOBILE_OPENED,
    AnalyticsEventType.PANEL_USED,
    AnalyticsEventType.DATA_LOAD_ERROR,
  ])("records %s without JWT", async (type) => {
    const body = buildSupportedEventBody(type);
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      clientEventId: body.clientEventId,
      type,
      createdAt: expect.any(String),
    });

    const stored = await prisma.analyticsEvent.findUnique({
      where: { clientEventId: body.clientEventId as string },
    });
    expect(stored).toMatchObject({
      id: response.body.id,
      type,
      source: body.source,
      sessionId: body.sessionId,
      panelId: body.panelId ?? null,
      storeId: body.storeId ?? null,
      categoryId: body.categoryId ?? null,
      promotionId: body.promotionId ?? null,
      query: type === AnalyticsEventType.SEARCH_QUERY ? "sport shoes" : null,
      adSlotId: null,
      campaignId: null,
      creativeId: null,
    });
    expect(stored?.deviceData).toEqual({ platform: "e2e" });
    expect(stored?.payload).toEqual(body.payload ?? null);
  });

  it("accepts explicit null for optional fields", async () => {
    const body = buildEventBody(AnalyticsEventType.SESSION_STARTED, {
      sessionId: null,
      panelId: null,
      storeId: null,
      categoryId: null,
      promotionId: null,
      query: null,
      deviceData: null,
      payload: null,
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);

    const stored = await prisma.analyticsEvent.findUnique({
      where: { clientEventId: body.clientEventId as string },
    });
    expect(stored).toMatchObject({
      sessionId: null,
      panelId: null,
      storeId: null,
      categoryId: null,
      promotionId: null,
      query: null,
      deviceData: null,
      payload: null,
    });
  });

  it("rejects ADMIN source", async () => {
    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(AnalyticsEventType.SESSION_STARTED, {
          source: AnalyticsSource.ADMIN,
        }),
      )
      .expect(400);
  });

  it.each([
    ["missing", undefined],
    ["whitespace-only", "   \t  "],
  ])("rejects a %s clientEventId", async (_label, value) => {
    const sessionId = prefix + "-invalid-client-event-id-" + unique("session");
    const body = buildEventBody(AnalyticsEventType.SESSION_STARTED, {
      clientEventId: value,
      sessionId,
    });

    if (value === undefined) {
      delete body.clientEventId;
    }

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(400);
    await expect(
      prisma.analyticsEvent.count({ where: { sessionId } }),
    ).resolves.toBe(0);
  });

  it.each([
    AnalyticsEventType.AD_IMPRESSION,
    AnalyticsEventType.AD_CLICK,
  ])("rejects unsupported event type %s", async (type) => {
    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(buildEventBody(type))
      .expect(400);
  });

  it.each([
    [AnalyticsEventType.SEARCH_QUERY, AnalyticsSource.MOBILE, "query"],
    [
      AnalyticsEventType.CATEGORY_SELECTED,
      AnalyticsSource.MOBILE,
      "categoryId",
    ],
    [AnalyticsEventType.STORE_SELECTED, AnalyticsSource.MOBILE, "storeId"],
    [AnalyticsEventType.STORE_CARD_VIEWED, AnalyticsSource.MOBILE, "storeId"],
    [
      AnalyticsEventType.PROMOTION_VIEWED,
      AnalyticsSource.MOBILE,
      "promotionId",
    ],
  ])("requires the subject field for %s", async (type, source, field) => {
    const body = buildEventBody(type, { source });
    delete body[field];

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(400);
  });

  it("rejects a whitespace-only SEARCH_QUERY", async () => {
    const body = buildEventBody(AnalyticsEventType.SEARCH_QUERY, {
      query: "   \t  ",
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(400);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(0);
  });

  it("requires panelId for PANEL source", async () => {
    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(AnalyticsEventType.SESSION_STARTED, {
          source: AnalyticsSource.PANEL,
          panelId: null,
        }),
      )
      .expect(400);
  });

  it.each([AnalyticsEventType.SESSION_RESET, AnalyticsEventType.PANEL_USED])(
    "requires PANEL source for %s",
    async (type) => {
      await request(app.getHttpServer())
        .post(eventsUrl)
        .send(buildEventBody(type, { source: AnalyticsSource.MOBILE }))
        .expect(400);
    },
  );

  it("requires MOBILE source for MOBILE_OPENED", async () => {
    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(AnalyticsEventType.MOBILE_OPENED, {
          source: AnalyticsSource.PANEL,
          panelId,
        }),
      )
      .expect(400);
  });

  it.each([
    [
      "Panel",
      AnalyticsEventType.SESSION_STARTED,
      { panelId: prefix + "-missing-panel" },
    ],
    [
      "Store",
      AnalyticsEventType.STORE_SELECTED,
      { storeId: prefix + "-missing-store" },
    ],
    [
      "Category",
      AnalyticsEventType.CATEGORY_SELECTED,
      { categoryId: prefix + "-missing-category" },
    ],
    [
      "Promotion",
      AnalyticsEventType.PROMOTION_VIEWED,
      { promotionId: prefix + "-missing-promotion" },
    ],
  ])("returns 404 for a nonexistent %s", async (entity, type, subject) => {
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(buildEventBody(type, subject))
      .expect(404);

    expect(response.body.message).toBe(entity + " not found");
  });

  it("checks reference existence without lifecycle filtering", async () => {
    const inactiveTenant = await prisma.tenant.create({
      data: { name: prefix + " inactive tenant", isActive: false },
    });
    const inactiveCategory = await prisma.category.create({
      data: {
        name: prefix + " inactive category",
        slug: prefix + "-inactive-category",
        isActive: false,
      },
    });
    const inactiveStore = await prisma.store.create({
      data: {
        tenantId: inactiveTenant.id,
        categoryId: inactiveCategory.id,
        name: prefix + " inactive store",
        slug: prefix + "-inactive-store",
        isActive: false,
        isVisible: false,
      },
    });
    const deletedPromotion = await prisma.promotion.create({
      data: {
        title: prefix + " deleted promotion",
        slug: prefix + "-deleted-promotion",
        tenantId: inactiveTenant.id,
        storeId: inactiveStore.id,
        isActive: false,
        deletedAt: new Date(),
      },
    });
    const inactivePanel = await prisma.panel.create({
      data: {
        code: prefix + "-inactive-panel",
        name: prefix + " inactive panel",
        isActive: false,
      },
    });
    const body = buildEventBody(AnalyticsEventType.SESSION_STARTED, {
      panelId: inactivePanel.id,
      storeId: inactiveStore.id,
      categoryId: inactiveCategory.id,
      promotionId: deletedPromotion.id,
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);
  });

  it("rejects advertising and server-controlled fields through whitelist validation", async () => {
    const body = buildEventBody(AnalyticsEventType.SESSION_STARTED, {
      campaignId: prefix + "-campaign",
      creativeId: prefix + "-creative",
      adSlotId: prefix + "-slot",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(400);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(0);
  });

  it("returns the existing event for an identical idempotent replay", async () => {
    const body = buildEventBody(AnalyticsEventType.ROUTE_BUILT, {
      payload: {
        fromNodeId: "entrance",
        route: { distance: 120, nodes: ["entrance", "store"] },
      },
    });

    const created = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(201);
    const replayed = await request(app.getHttpServer())
      .post(eventsUrl)
      .send({
        ...body,
        payload: {
          route: { nodes: ["entrance", "store"], distance: 120 },
          fromNodeId: "entrance",
        },
      })
      .expect(200);

    expect(replayed.body).toEqual(created.body);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);
  });

  it("returns 409 when payload changes for the same idempotency identity", async () => {
    const body = buildEventBody(AnalyticsEventType.ROUTE_BUILT, {
      payload: {
        fromNodeId: "entrance",
        toNodeId: "store-anchor",
        totalDistance: 120,
      },
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send({
        ...body,
        payload: {
          fromNodeId: "entrance",
          toNodeId: "store-anchor",
          totalDistance: 240,
        },
      })
      .expect(409);

    expect(response.body.message).toBe(
      "clientEventId is already used for a different visitor/navigation event",
    );
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);
  });

  it("ignores deviceData changes when resolving an idempotent replay", async () => {
    const body = buildEventBody(AnalyticsEventType.SESSION_STARTED, {
      deviceData: { platform: "panel", appVersion: "1.0.0" },
    });

    const created = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(201);
    const replayed = await request(app.getHttpServer())
      .post(eventsUrl)
      .send({
        ...body,
        deviceData: { platform: "mobile", appVersion: "2.0.0" },
      })
      .expect(200);

    expect(replayed.body).toEqual(created.body);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);

    const stored = await prisma.analyticsEvent.findUniqueOrThrow({
      where: { clientEventId: body.clientEventId as string },
      select: { deviceData: true },
    });
    expect(stored.deviceData).toEqual({
      platform: "panel",
      appVersion: "1.0.0",
    });
  });

  it("stores the qrToken for QR_SCANNED and treats it as identity", async () => {
    const body = buildEventBody(AnalyticsEventType.QR_SCANNED, {
      qrToken: prefix + "-identity-qr-token",
      storeId,
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);

    const stored = await prisma.analyticsEvent.findUniqueOrThrow({
      where: { clientEventId: body.clientEventId as string },
    });
    expect(stored).toMatchObject({
      type: AnalyticsEventType.QR_SCANNED,
      source: AnalyticsSource.MOBILE,
      storeId,
      qrToken: prefix + "-identity-qr-token",
    });

    const replay = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(200);
    expect(replay.body.clientEventId).toBe(body.clientEventId);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);

    await request(app.getHttpServer())
      .post(eventsUrl)
      .send({ ...body, qrToken: prefix + "-other-qr-token" })
      .expect(409);
  });

  it("returns 409 when clientEventId is reused for another identity", async () => {
    const body = buildEventBody(AnalyticsEventType.SEARCH_QUERY, {
      query: "sport",
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send({ ...body, query: "food" })
      .expect(409);

    expect(response.body.message).toBe(
      "clientEventId is already used for a different visitor/navigation event",
    );
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);
  });

  it("is race-safe for concurrent identical requests", async () => {
    const body = buildEventBody(AnalyticsEventType.SESSION_ENDED);
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app.getHttpServer()).post(eventsUrl).send(body),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 200, 201]);
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);
  });

  it("does not mutate Panel runtime fields", async () => {
    const before = await prisma.panel.findUniqueOrThrow({
      where: { id: panelId },
      select: { status: true, appVersion: true, lastSeenAt: true },
    });
    const body = buildEventBody(AnalyticsEventType.PANEL_USED, {
      source: AnalyticsSource.PANEL,
      panelId,
    });

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);

    const after = await prisma.panel.findUniqueOrThrow({
      where: { id: panelId },
      select: { status: true, appVersion: true, lastSeenAt: true },
    });
    expect(after).toEqual(before);
    expect(after).toEqual({
      status: PanelStatus.MAINTENANCE,
      appVersion: "visitor-e2e-original",
      lastSeenAt: originalPanelLastSeenAt,
    });
  });

  it("keeps advertising tracking on its separate endpoint", async () => {
    const slot = await prisma.adSlot.create({
      data: {
        code: prefix + "-ad-slot",
        name: prefix + " ad slot",
        placement: AdPlacement.HOME_PANEL_BANNER,
        panelId,
      },
    });
    const campaign = await prisma.adCampaign.create({
      data: {
        name: prefix + " ad campaign",
        placement: AdPlacement.HOME_PANEL_BANNER,
      },
    });
    const creative = await prisma.adCreative.create({
      data: {
        campaignId: campaign.id,
        title: prefix + " ad creative",
      },
    });
    await prisma.adCampaignAssignment.create({
      data: {
        campaignId: campaign.id,
        slotId: slot.id,
      },
    });
    const body = {
      clientEventId: clientEventId("advertising-regression"),
      type: AnalyticsEventType.AD_IMPRESSION,
      slotCode: slot.code,
      campaignId: campaign.id,
      creativeId: creative.id,
      source: AnalyticsSource.PANEL,
      panelId,
    };

    const response = await request(app.getHttpServer())
      .post("/api/public/ads/events")
      .send(body)
      .expect(201);

    expect(response.body).toMatchObject({
      clientEventId: body.clientEventId,
      type: AnalyticsEventType.AD_IMPRESSION,
    });
  });
});
