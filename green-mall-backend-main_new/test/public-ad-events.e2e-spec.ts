import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AdPlacement,
  AnalyticsEventType,
  AnalyticsSource,
  FileAssetKind,
  Prisma,
} from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Public advertising event tracking API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "public-ad-events-e2e-" + runId;
  const eventsUrl = "/api/public/ads/events";
  let sequence = 0;

  const unique = (label: string) => label + "-" + ++sequence;
  const clientEventId = (label: string) => prefix + "-" + unique(label);

  async function createPanel(
    label: string,
    data: Partial<Prisma.PanelUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.panel.create({
      data: {
        code: prefix + "-" + suffix,
        name: prefix + " " + suffix,
        isActive: true,
        ...data,
      },
    });
  }

  async function createSlot(
    label: string,
    data: Partial<Prisma.AdSlotUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.adSlot.create({
      data: {
        code: prefix + "-" + suffix,
        name: prefix + " " + suffix,
        placement: AdPlacement.HOME_PANEL_BANNER,
        isActive: true,
        ...data,
      },
    });
  }

  async function createCampaign(
    label: string,
    data: Partial<Prisma.AdCampaignUncheckedCreateInput> = {},
  ) {
    return prisma.adCampaign.create({
      data: {
        name: prefix + " " + unique(label),
        placement: AdPlacement.HOME_PANEL_BANNER,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
        isActive: true,
        ...data,
      },
    });
  }

  async function createCreative(
    campaignId: string,
    label: string,
    data: Partial<Prisma.AdCreativeUncheckedCreateInput> = {},
  ) {
    return prisma.adCreative.create({
      data: {
        campaignId,
        title: prefix + " " + unique(label),
        isActive: true,
        ...data,
      },
    });
  }

  async function createAssignment(
    campaignId: string,
    slotId: string,
    data: Partial<Prisma.AdCampaignAssignmentUncheckedCreateInput> = {},
  ) {
    return prisma.adCampaignAssignment.create({
      data: {
        campaignId,
        slotId,
        isActive: true,
        ...data,
      },
    });
  }

  async function createImageAsset(label: string) {
    const suffix = unique(label);
    return prisma.fileAsset.create({
      data: {
        filename: prefix + "-" + suffix + ".png",
        url: "https://cdn.greenmall.test/" + prefix + "/" + suffix + ".png",
        mimeType: "image/png",
        kind: FileAssetKind.IMAGE,
        isActive: true,
      },
    });
  }

  async function createTrackingFixture(
    label: string,
    options: {
      panelBound?: boolean;
      campaign?: Partial<Prisma.AdCampaignUncheckedCreateInput>;
      creative?: Partial<Prisma.AdCreativeUncheckedCreateInput>;
      assignment?: Partial<Prisma.AdCampaignAssignmentUncheckedCreateInput>;
    } = {},
  ) {
    const panel = await createPanel(label + "-panel");
    const slot = await createSlot(label + "-slot", {
      panelId: options.panelBound === false ? null : panel.id,
    });
    const campaign = await createCampaign(
      label + "-campaign",
      options.campaign,
    );
    const creative = await createCreative(
      campaign.id,
      label + "-creative",
      options.creative,
    );
    const assignment = await createAssignment(
      campaign.id,
      slot.id,
      options.assignment,
    );

    return { panel, slot, campaign, creative, assignment };
  }

  function buildEventBody(
    fixture: Awaited<ReturnType<typeof createTrackingFixture>>,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      clientEventId: clientEventId("event"),
      type: AnalyticsEventType.AD_IMPRESSION,
      slotCode: fixture.slot.code,
      campaignId: fixture.campaign.id,
      creativeId: fixture.creative.id,
      source: AnalyticsSource.PANEL,
      panelId: fixture.panel.id,
      sessionId: prefix + "-session",
      deviceData: { platform: "e2e" },
      ...overrides,
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
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.fileAsset.deleteMany({
          where: { filename: { startsWith: prefix } },
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it.each([
    [AnalyticsEventType.AD_IMPRESSION, AnalyticsSource.PANEL],
    [AnalyticsEventType.AD_IMPRESSION, AnalyticsSource.MOBILE],
    [AnalyticsEventType.AD_CLICK, AnalyticsSource.PANEL],
    [AnalyticsEventType.AD_CLICK, AnalyticsSource.MOBILE],
  ])("records %s from %s without JWT", async (type, source) => {
    const fixture = await createTrackingFixture(
      type.toLowerCase() + "-" + source.toLowerCase(),
    );
    const body = buildEventBody(fixture, {
      type,
      source,
      panelId: source === AnalyticsSource.PANEL ? fixture.panel.id : undefined,
    });

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
      clientEventId: body.clientEventId,
      type,
      source,
      sessionId: body.sessionId,
      panelId: source === AnalyticsSource.PANEL ? fixture.panel.id : null,
      adSlotId: fixture.slot.id,
      campaignId: fixture.campaign.id,
      creativeId: fixture.creative.id,
      deviceData: { platform: "e2e" },
    });
    expect(stored?.createdAt.toISOString()).toBe(response.body.createdAt);
  });

  it("rejects ADMIN source", async () => {
    const fixture = await createTrackingFixture("admin-source");

    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          source: AnalyticsSource.ADMIN,
        }),
      )
      .expect(400);
  });

  it("rejects AnalyticsEventType values outside advertising tracking", async () => {
    const fixture = await createTrackingFixture("other-event-type");

    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          type: AnalyticsEventType.SEARCH_QUERY,
        }),
      )
      .expect(400);
  });

  it("requires panelId for PANEL source", async () => {
    const fixture = await createTrackingFixture("panel-id-required");

    await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          panelId: undefined,
        }),
      )
      .expect(400);
  });

  it("returns 404 for a nonexistent Slot", async () => {
    const fixture = await createTrackingFixture("missing-slot");
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          slotCode: prefix + "-missing-slot",
        }),
      )
      .expect(404);

    expect(response.body.message).toBe("Ad slot not found");
  });

  it("returns 404 for a nonexistent Campaign", async () => {
    const fixture = await createTrackingFixture("missing-campaign");
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          campaignId: prefix + "-missing-campaign",
        }),
      )
      .expect(404);

    expect(response.body.message).toBe("Ad campaign not found");
  });

  it("returns 404 for a nonexistent Creative", async () => {
    const fixture = await createTrackingFixture("missing-creative");
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          creativeId: prefix + "-missing-creative",
        }),
      )
      .expect(404);

    expect(response.body.message).toBe("Ad creative not found");
  });

  it("rejects a Creative belonging to another Campaign", async () => {
    const fixture = await createTrackingFixture("creative-other-campaign");
    const otherCampaign = await createCampaign("creative-other-campaign-owner");
    const otherCreative = await createCreative(
      otherCampaign.id,
      "creative-other-campaign-target",
    );
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          creativeId: otherCreative.id,
        }),
      )
      .expect(400);

    expect(response.body.message).toBe(
      "Ad creative does not belong to the specified campaign",
    );
  });

  it("returns 404 when Campaign is not assigned to the Slot", async () => {
    const fixture = await createTrackingFixture("missing-assignment");
    const unassignedSlot = await createSlot("missing-assignment-target", {
      panelId: fixture.panel.id,
    });
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          slotCode: unassignedSlot.code,
        }),
      )
      .expect(404);

    expect(response.body.message).toBe("Ad campaign assignment not found");
  });

  it("rejects a different Panel for a panel-bound Slot", async () => {
    const fixture = await createTrackingFixture("wrong-panel");
    const otherPanel = await createPanel("wrong-panel-other");
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          panelId: otherPanel.id,
        }),
      )
      .expect(400);

    expect(response.body.message).toBe("Panel does not match ad slot");
  });

  it("returns 404 for a nonexistent Panel", async () => {
    const fixture = await createTrackingFixture("missing-panel", {
      panelBound: false,
    });
    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(
        buildEventBody(fixture, {
          panelId: prefix + "-missing-panel",
        }),
      )
      .expect(404);

    expect(response.body.message).toBe("Panel not found");
  });

  it("rejects client-controlled createdAt and adSlotId", async () => {
    const fixture = await createTrackingFixture("server-controlled-fields");

    await request(app.getHttpServer())
      .post(eventsUrl)
      .send({
        ...buildEventBody(fixture),
        createdAt: "2020-01-01T00:00:00.000Z",
        adSlotId: fixture.slot.id,
      })
      .expect(400);
  });

  it("returns the existing event for an identical idempotent replay", async () => {
    const fixture = await createTrackingFixture("idempotent-replay");
    const body = buildEventBody(fixture);

    const created = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(201);
    const replayed = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(200);

    expect(replayed.body).toEqual(created.body);
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);
  });

  it("returns 409 when clientEventId is reused for another identity", async () => {
    const fixture = await createTrackingFixture("idempotency-conflict");
    const body = buildEventBody(fixture);

    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);

    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send({
        ...body,
        type: AnalyticsEventType.AD_CLICK,
      })
      .expect(409);

    expect(response.body.message).toBe(
      "clientEventId is already used for a different advertising event",
    );
    await expect(
      prisma.analyticsEvent.count({
        where: { clientEventId: body.clientEventId as string },
      }),
    ).resolves.toBe(1);
  });

  it("is race-safe for concurrent identical requests", async () => {
    const fixture = await createTrackingFixture("concurrent-replay");
    const body = buildEventBody(fixture);
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

  it("accepts a delayed event after Campaign, Creative and Assignment lifecycle changes", async () => {
    const fixture = await createTrackingFixture("delayed-after-lifecycle");
    const deletedAt = new Date();

    const [campaign, creative, assignment] = await prisma.$transaction([
      prisma.adCampaign.update({
        where: { id: fixture.campaign.id },
        data: {
          isActive: false,
          endsAt: new Date(Date.now() - 1_000),
          deletedAt,
        },
      }),
      prisma.adCreative.update({
        where: { id: fixture.creative.id },
        data: { isActive: false, deletedAt },
      }),
      prisma.adCampaignAssignment.update({
        where: { id: fixture.assignment.id },
        data: { isActive: false, deletedAt },
      }),
    ]);

    expect(campaign).toMatchObject({ isActive: false, deletedAt });
    expect(creative).toMatchObject({ isActive: false, deletedAt });
    expect(assignment).toMatchObject({ isActive: false, deletedAt });

    const body = buildEventBody(fixture, {
      type: AnalyticsEventType.AD_CLICK,
    });
    await request(app.getHttpServer()).post(eventsUrl).send(body).expect(201);

    const stored = await prisma.analyticsEvent.findUnique({
      where: { clientEventId: body.clientEventId as string },
    });
    expect(stored).toMatchObject({
      type: AnalyticsEventType.AD_CLICK,
      adSlotId: fixture.slot.id,
      campaignId: fixture.campaign.id,
      creativeId: fixture.creative.id,
    });
  });

  it("does not create AD_IMPRESSION when delivery is requested", async () => {
    const asset = await createImageAsset("delivery-no-tracking");
    const fixture = await createTrackingFixture("delivery-no-tracking", {
      creative: { assetId: asset.id },
    });

    const response = await request(app.getHttpServer())
      .get("/api/public/ads/slots/" + fixture.slot.code)
      .expect(200);
    expect(response.body.ad).not.toBeNull();

    await expect(
      prisma.analyticsEvent.count({
        where: {
          adSlotId: fixture.slot.id,
          type: AnalyticsEventType.AD_IMPRESSION,
        },
      }),
    ).resolves.toBe(0);
  });

  it("returns only the minimal public acknowledgement", async () => {
    const fixture = await createTrackingFixture("safe-response");
    const body = buildEventBody(fixture);

    const response = await request(app.getHttpServer())
      .post(eventsUrl)
      .send(body)
      .expect(201);

    expect(Object.keys(response.body).sort()).toEqual(
      ["id", "clientEventId", "type", "createdAt"].sort(),
    );
    for (const privateField of [
      "source",
      "sessionId",
      "panelId",
      "adSlotId",
      "campaignId",
      "creativeId",
      "deviceData",
      "payload",
    ]) {
      expect(response.body).not.toHaveProperty(privateField);
    }
  });
});
