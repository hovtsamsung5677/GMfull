import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AdPlacement,
  AnalyticsEventType,
  AnalyticsSource,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Advertising analytics admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "ad-analytics-e2e-" + runId;
  const password = "AdAnalyticsE2e12345!";
  const summaryUrl = "/api/admin/analytics/ads/summary";
  const breakdownUrl = "/api/admin/analytics/ads/breakdown";
  const auth = (token: string) => ({ Authorization: "Bearer " + token });
  const createdRoleIds: string[] = [];
  const tokens: Record<string, string> = {};
  const futureBaseMs = Date.now() + 50 * 365 * 24 * 60 * 60 * 1000;
  let sequence = 0;
  let windowSequence = 0;

  const unique = (label: string) => label + "-" + ++sequence;

  function nextWindow() {
    const fromMs = futureBaseMs + ++windowSequence * 10_000;
    return {
      from: new Date(fromMs),
      to: new Date(fromMs + 5_000),
      at: (offsetMs: number) => new Date(fromMs + offsetMs),
    };
  }

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
        description: "Temporary role created by AdAnalytics e2e tests",
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
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "AdAnalytics E2E " + label,
        roleId,
        isActive: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);

    tokens[label] = response.body.accessToken as string;
  }

  async function createGraph(label: string) {
    const suffix = unique(label);
    const panel = await prisma.panel.create({
      data: {
        code: prefix + "-panel-" + suffix,
        name: prefix + " Panel " + suffix,
        isActive: true,
      },
    });
    const slot = await prisma.adSlot.create({
      data: {
        code: prefix + "-slot-" + suffix,
        name: prefix + " Slot " + suffix,
        description: "Internal slot description",
        placement: AdPlacement.HOME_PANEL_BANNER,
        panelId: panel.id,
        isActive: true,
        metadata: { privateSlotData: true },
      },
    });
    const campaign = await prisma.adCampaign.create({
      data: {
        name: prefix + " Campaign " + suffix,
        description: "Internal campaign description",
        placement: AdPlacement.HOME_PANEL_BANNER,
        isActive: true,
        metadata: { privateCampaignData: true },
      },
    });
    const creative = await prisma.adCreative.create({
      data: {
        campaignId: campaign.id,
        title: prefix + " Creative " + suffix,
        description: "Internal creative description",
        isActive: true,
        metadata: { privateCreativeData: true },
      },
    });

    return { panel, slot, campaign, creative };
  }

  async function createEvent(
    graph: Awaited<ReturnType<typeof createGraph>>,
    type: AnalyticsEventType,
    createdAt: Date,
    data: Partial<Prisma.AnalyticsEventUncheckedCreateInput> = {},
  ) {
    return prisma.analyticsEvent.create({
      data: {
        clientEventId: prefix + "-event-" + unique(type.toLowerCase()),
        type,
        source: AnalyticsSource.PANEL,
        panelId: graph.panel.id,
        adSlotId: graph.slot.id,
        campaignId: graph.campaign.id,
        creativeId: graph.creative.id,
        createdAt,
        ...data,
      },
    });
  }

  function periodQuery(window: ReturnType<typeof nextWindow>) {
    return {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
    };
  }

  async function getSummary(query: Record<string, unknown>) {
    return request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(query)
      .expect(200);
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
      "ANALYTICS_VIEWER",
      "analytics-viewer",
      passwordHash,
    );
    await createUserAndLogin(
      "CONTENT_MANAGER",
      "content-manager",
      passwordHash,
    );
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
        await prisma.adSlot.deleteMany({
          where: { code: { startsWith: prefix } },
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
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("returns 401 without JWT", async () => {
    await request(app.getHttpServer()).get(summaryUrl).expect(401);
    await request(app.getHttpServer())
      .get(breakdownUrl)
      .query({ groupBy: "campaign" })
      .expect(401);
  });

  it.each(["super-admin", "mall-admin", "ads-manager", "analytics-viewer"])(
    "allows %s to read both advertising analytics endpoints",
    async (label) => {
      const headers = auth(tokens[label]);
      await request(app.getHttpServer())
        .get(summaryUrl)
        .set(headers)
        .expect(200);
      await request(app.getHttpServer())
        .get(breakdownUrl)
        .set(headers)
        .query({ groupBy: "campaign" })
        .expect(200);
    },
  );

  it("returns 403 to CONTENT_MANAGER", async () => {
    const headers = auth(tokens["content-manager"]);
    await request(app.getHttpServer()).get(summaryUrl).set(headers).expect(403);
    await request(app.getHttpServer())
      .get(breakdownUrl)
      .set(headers)
      .query({ groupBy: "campaign" })
      .expect(403);
  });

  it("returns summary counts and CTR while ignoring other event types", async () => {
    const graph = await createGraph("summary");
    const window = nextWindow();
    await createEvent(graph, AnalyticsEventType.AD_IMPRESSION, window.at(500));
    await createEvent(graph, AnalyticsEventType.AD_IMPRESSION, window.at(1000));
    await createEvent(graph, AnalyticsEventType.AD_CLICK, window.at(1500));
    await createEvent(graph, AnalyticsEventType.SEARCH_QUERY, window.at(2000));

    const response = await getSummary({
      ...periodQuery(window),
      campaignId: graph.campaign.id,
    });

    expect(response.body).toEqual({ impressions: 2, clicks: 1, ctr: 0.5 });
  });

  it("returns CTR 0 when there are clicks but no impressions", async () => {
    const graph = await createGraph("zero-impressions");
    const window = nextWindow();
    await createEvent(graph, AnalyticsEventType.AD_CLICK, window.at(1000));
    await createEvent(graph, AnalyticsEventType.AD_CLICK, window.at(2000));

    const response = await getSummary({
      ...periodQuery(window),
      creativeId: graph.creative.id,
    });

    expect(response.body).toEqual({ impressions: 0, clicks: 2, ctr: 0 });
  });

  it("uses the half-open [from, to) time range", async () => {
    const graph = await createGraph("time-range");
    const window = nextWindow();
    await createEvent(graph, AnalyticsEventType.AD_CLICK, window.at(-1));
    await createEvent(graph, AnalyticsEventType.AD_IMPRESSION, window.at(0));
    await createEvent(graph, AnalyticsEventType.AD_CLICK, window.at(4999));
    await createEvent(graph, AnalyticsEventType.AD_CLICK, window.at(5000));

    const response = await getSummary({
      ...periodQuery(window),
      campaignId: graph.campaign.id,
    });

    expect(response.body).toEqual({ impressions: 1, clicks: 1, ctr: 1 });
  });

  it.each([
    ["invalid datetime", { from: "not-a-date" }],
    [
      "equal range boundaries",
      { from: "2040-01-01T00:00:00.000Z", to: "2040-01-01T00:00:00.000Z" },
    ],
    [
      "reversed range",
      { from: "2040-01-02T00:00:00.000Z", to: "2040-01-01T00:00:00.000Z" },
    ],
    ["unsupported source", { source: AnalyticsSource.ADMIN }],
  ])("returns 400 for %s", async (_label, query) => {
    await request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(query)
      .expect(400);
  });

  it("requires a supported groupBy value", async () => {
    const headers = auth(tokens["analytics-viewer"]);
    await request(app.getHttpServer())
      .get(breakdownUrl)
      .set(headers)
      .expect(400);
    await request(app.getHttpServer())
      .get(breakdownUrl)
      .set(headers)
      .query({ groupBy: "tenant" })
      .expect(400);
  });

  it("combines campaign, creative, slot, panel and source filters", async () => {
    const first = await createGraph("filters-first");
    const second = await createGraph("filters-second");
    const window = nextWindow();
    await createEvent(first, AnalyticsEventType.AD_IMPRESSION, window.at(500));
    await createEvent(first, AnalyticsEventType.AD_CLICK, window.at(1000), {
      source: AnalyticsSource.MOBILE,
      panelId: null,
    });
    await createEvent(
      second,
      AnalyticsEventType.AD_IMPRESSION,
      window.at(1500),
    );
    await createEvent(
      second,
      AnalyticsEventType.AD_IMPRESSION,
      window.at(2000),
    );

    const period = periodQuery(window);
    expect(
      (await getSummary({ ...period, campaignId: first.campaign.id })).body,
    ).toEqual({ impressions: 1, clicks: 1, ctr: 1 });
    expect(
      (await getSummary({ ...period, creativeId: second.creative.id })).body,
    ).toEqual({ impressions: 2, clicks: 0, ctr: 0 });
    expect(
      (await getSummary({ ...period, adSlotId: first.slot.id })).body,
    ).toEqual({ impressions: 1, clicks: 1, ctr: 1 });
    expect(
      (await getSummary({ ...period, panelId: first.panel.id })).body,
    ).toEqual({ impressions: 1, clicks: 0, ctr: 0 });
    expect(
      (await getSummary({ ...period, source: AnalyticsSource.MOBILE })).body,
    ).toEqual({ impressions: 0, clicks: 1, ctr: 0 });
    expect(
      (
        await getSummary({
          ...period,
          campaignId: first.campaign.id,
          creativeId: first.creative.id,
          adSlotId: first.slot.id,
          panelId: first.panel.id,
          source: AnalyticsSource.PANEL,
        })
      ).body,
    ).toEqual({ impressions: 1, clicks: 0, ctr: 0 });

    const breakdown = await request(app.getHttpServer())
      .get(breakdownUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query({
        ...period,
        groupBy: "campaign",
        campaignId: first.campaign.id,
        creativeId: first.creative.id,
        adSlotId: first.slot.id,
        panelId: first.panel.id,
        source: AnalyticsSource.PANEL,
      })
      .expect(200);

    expect(breakdown.body.items).toHaveLength(1);
    expect(breakdown.body.items[0]).toMatchObject({
      entityId: first.campaign.id,
      impressions: 1,
      clicks: 0,
      ctr: 0,
    });
  });

  it("groups every supported dimension with deterministic order and safe projections", async () => {
    const first = await createGraph("breakdown-first");
    const second = await createGraph("breakdown-second");
    const third = await createGraph("breakdown-third");
    const window = nextWindow();

    for (const [graph, impressions, clicks, offset] of [
      [first, 3, 1, 100],
      [second, 3, 2, 1000],
      [third, 1, 3, 2000],
    ] as const) {
      for (let index = 0; index < impressions; index += 1) {
        await createEvent(
          graph,
          AnalyticsEventType.AD_IMPRESSION,
          window.at(offset + index * 10),
        );
      }
      for (let index = 0; index < clicks; index += 1) {
        await createEvent(
          graph,
          AnalyticsEventType.AD_CLICK,
          window.at(offset + 100 + index * 10),
        );
      }
    }

    const dimensions = [
      {
        groupBy: "campaign",
        id: (graph: typeof first) => graph.campaign.id,
        entity: (graph: typeof first) => ({
          id: graph.campaign.id,
          name: graph.campaign.name,
          code: null,
          placement: graph.campaign.placement,
          campaignId: null,
        }),
      },
      {
        groupBy: "creative",
        id: (graph: typeof first) => graph.creative.id,
        entity: (graph: typeof first) => ({
          id: graph.creative.id,
          name: graph.creative.title,
          code: null,
          placement: null,
          campaignId: graph.campaign.id,
        }),
      },
      {
        groupBy: "slot",
        id: (graph: typeof first) => graph.slot.id,
        entity: (graph: typeof first) => ({
          id: graph.slot.id,
          name: graph.slot.name,
          code: graph.slot.code,
          placement: graph.slot.placement,
          campaignId: null,
        }),
      },
      {
        groupBy: "panel",
        id: (graph: typeof first) => graph.panel.id,
        entity: (graph: typeof first) => ({
          id: graph.panel.id,
          name: graph.panel.name,
          code: graph.panel.code,
          placement: null,
          campaignId: null,
        }),
      },
    ];

    for (const dimension of dimensions) {
      const response = await request(app.getHttpServer())
        .get(breakdownUrl)
        .set(auth(tokens["analytics-viewer"]))
        .query({ ...periodQuery(window), groupBy: dimension.groupBy })
        .expect(200);

      expect(response.body.groupBy).toBe(dimension.groupBy);
      expect(response.body.items).toHaveLength(3);
      expect(
        response.body.items.map((item: { entityId: string }) => item.entityId),
      ).toEqual([
        dimension.id(second),
        dimension.id(first),
        dimension.id(third),
      ]);
      expect(response.body.items[0]).toEqual({
        entityId: dimension.id(second),
        entity: dimension.entity(second),
        impressions: 3,
        clicks: 2,
        ctr: 2 / 3,
      });
      expect(response.body.items[1]).toEqual({
        entityId: dimension.id(first),
        entity: dimension.entity(first),
        impressions: 3,
        clicks: 1,
        ctr: 1 / 3,
      });
      expect(response.body.items[2]).toEqual({
        entityId: dimension.id(third),
        entity: dimension.entity(third),
        impressions: 1,
        clicks: 3,
        ctr: 3,
      });
      for (const item of response.body.items as Array<{
        entity: Record<string, unknown>;
      }>) {
        expect(Object.keys(item.entity).sort()).toEqual(
          ["campaignId", "code", "id", "name", "placement"].sort(),
        );
      }
    }
  });
});
