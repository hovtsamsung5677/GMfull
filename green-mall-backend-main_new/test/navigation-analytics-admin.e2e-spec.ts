import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AnalyticsEventType,
  AnalyticsSource,
  PanelStatus,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Navigation analytics admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "navigation-analytics-e2e-" + runId;
  const password = "NavigationAnalyticsE2e12345!";
  const DAY_MS = 86_400_000;
  const summaryUrl = "/api/admin/analytics/navigation/summary";
  const dailyUrl = "/api/admin/analytics/navigation/daily";
  const hourlyUrl = "/api/admin/analytics/navigation/hourly";
  const routesByStoreUrl = "/api/admin/analytics/navigation/routes-by-store";
  const auth = (token: string) => ({ Authorization: "Bearer " + token });
  const createdRoleIds: string[] = [];
  const tokens: Record<string, string> = {};
  const futureBaseMs = Date.now() + 50 * 365 * 24 * 60 * 60 * 1000;
  let sequence = 0;
  let windowSequence = 0;
  let floorNumber = 90_000;
  let floorId = "";

  const unique = (label: string) => label + "-" + ++sequence;

  function nextWindow(days = 1) {
    const fromMs = futureBaseMs + ++windowSequence * 10 * DAY_MS;
    return {
      from: new Date(fromMs),
      to: new Date(fromMs + days * DAY_MS),
      at: (dayOffset: number, hour = 12) =>
        new Date(fromMs + dayOffset * DAY_MS + hour * 3_600_000),
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
        description: "Temporary role created by NavigationAnalytics e2e tests",
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
        name: "NavigationAnalytics E2E " + label,
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

  async function createEvent(
    type: AnalyticsEventType,
    createdAt: Date,
    data: Partial<Prisma.AnalyticsEventUncheckedCreateInput> = {},
  ) {
    return prisma.analyticsEvent.create({
      data: {
        clientEventId: prefix + "-event-" + unique(type.toLowerCase()),
        type,
        source: AnalyticsSource.PANEL,
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
    await createUserAndLogin("ANALYTICS_VIEWER", "analytics-viewer", passwordHash);
    await createUserAndLogin("CONTENT_MANAGER", "content-manager", passwordHash);

    const floor = await prisma.floor.create({
      data: { number: floorNumber, name: prefix + " floor" },
    });
    floorId = floor.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.analyticsEvent.deleteMany({
          where: { clientEventId: { startsWith: prefix } },
        });
        await prisma.store.deleteMany({ where: { slug: { startsWith: prefix } } });
        await prisma.category.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.tenant.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.floor.deleteMany({
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

  it("returns 401 without JWT", async () => {
    await request(app.getHttpServer()).get(summaryUrl).expect(401);
    await request(app.getHttpServer()).get(dailyUrl).expect(401);
    await request(app.getHttpServer()).get(hourlyUrl).expect(401);
    await request(app.getHttpServer()).get(routesByStoreUrl).expect(401);
  });

  it.each(["super-admin", "mall-admin", "ads-manager", "analytics-viewer"])(
    "allows %s to read every navigation analytics endpoint",
    async (label) => {
      const headers = auth(tokens[label]);
      await request(app.getHttpServer())
        .get(summaryUrl)
        .set(headers)
        .expect(200);
      await request(app.getHttpServer())
        .get(dailyUrl)
        .set(headers)
        .expect(200);
      await request(app.getHttpServer())
        .get(hourlyUrl)
        .set(headers)
        .expect(200);
      await request(app.getHttpServer())
        .get(routesByStoreUrl)
        .set(headers)
        .expect(200);
    },
  );

  it("returns 403 to CONTENT_MANAGER", async () => {
    const headers = auth(tokens["content-manager"]);
    await request(app.getHttpServer()).get(summaryUrl).set(headers).expect(403);
    await request(app.getHttpServer()).get(dailyUrl).set(headers).expect(403);
    await request(app.getHttpServer()).get(hourlyUrl).set(headers).expect(403);
    await request(app.getHttpServer())
      .get(routesByStoreUrl)
      .set(headers)
      .expect(403);
  });

  it("aggregates summary metrics over the half-open period", async () => {
    const window = nextWindow(1);
    const panel = await prisma.panel.create({
      data: {
        code: prefix + "-panel-" + unique("panel"),
        name: prefix + " panel",
        status: PanelStatus.ONLINE,
        isActive: true,
      },
    });

    for (let index = 0; index < 4; index += 1) {
      await createEvent(AnalyticsEventType.PANEL_USED, window.at(0, 10 + index), {
        panelId: panel.id,
      });
    }
    for (const [index, session] of ["s1", "s2", "s3"].entries()) {
      await createEvent(AnalyticsEventType.SESSION_STARTED, window.at(0, 12), {
        sessionId: prefix + "-session-" + session + "-" + index,
      });
    }
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 13), {
      storeId: null,
    });
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 14));
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 15));
    await createEvent(AnalyticsEventType.QR_SCANNED, window.at(0, 16), {
      source: AnalyticsSource.MOBILE,
      qrToken: prefix + "-qr-" + unique("token"),
    });
    await createEvent(AnalyticsEventType.QR_SCANNED, window.at(0, 17), {
      source: AnalyticsSource.MOBILE,
      qrToken: prefix + "-qr-" + unique("token"),
    });
    await createEvent(AnalyticsEventType.MOBILE_OPENED, window.at(0, 18), {
      source: AnalyticsSource.MOBILE,
    });
    await createEvent(AnalyticsEventType.MOBILE_OPENED, window.at(0, 19), {
      source: AnalyticsSource.MOBILE,
    });
    await createEvent(AnalyticsEventType.PANEL_USED, new Date(window.to.getTime() + 60_000), {
      panelId: panel.id,
    });

    const response = await request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(periodQuery(window))
      .expect(200);

    expect(response.body).toMatchObject({
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      panelClicks: 4,
      routesBuilt: 3,
      qrScans: 2,
      sessionsStarted: 3,
      mobileOpened: 2,
      uniqueSessions: 3,
    });
    expect(typeof response.body.panelClicksToday).toBe("number");
  });

  it("combines period, panel and source filters in summary", async () => {
    const window = nextWindow(1);
    const panel = await prisma.panel.create({
      data: {
        code: prefix + "-panel-" + unique("panel"),
        name: prefix + " panel",
        isActive: true,
      },
    });

    await createEvent(AnalyticsEventType.PANEL_USED, window.at(0, 9), {
      panelId: panel.id,
    });
    await createEvent(AnalyticsEventType.PANEL_USED, window.at(0, 10), {
      panelId: panel.id,
    });
    await createEvent(AnalyticsEventType.PANEL_USED, window.at(0, 11), {
      source: AnalyticsSource.MOBILE,
    });

    const period = periodQuery(window);
    const byPanel = await request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["mall-admin"]))
      .query({ ...period, panelId: panel.id })
      .expect(200);
    expect(byPanel.body).toMatchObject({ panelClicks: 2 });

    const bySource = await request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["mall-admin"]))
      .query({ ...period, source: AnalyticsSource.MOBILE })
      .expect(200);
    expect(bySource.body).toMatchObject({ panelClicks: 1 });
  });

  it("counts panel clicks of the current UTC day", async () => {
    await createEvent(AnalyticsEventType.PANEL_USED, new Date());
    await createEvent(AnalyticsEventType.PANEL_USED, new Date(Date.now() - DAY_MS));

    const response = await request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["analytics-viewer"]))
      .expect(200);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const expected = await prisma.analyticsEvent.count({
      where: {
        type: AnalyticsEventType.PANEL_USED,
        createdAt: { gte: todayStart },
      },
    });

    expect(response.body.panelClicksToday).toBe(expected);
    expect(response.body.panelClicks).toBeGreaterThanOrEqual(expected);
  });

  it("returns zero-filled daily buckets inside the period only", async () => {
    const window = nextWindow(5);
    await createEvent(AnalyticsEventType.PANEL_USED, window.at(0, 12));
    await createEvent(AnalyticsEventType.PANEL_USED, window.at(0, 13));
    await createEvent(AnalyticsEventType.QR_SCANNED, window.at(0, 14), {
      source: AnalyticsSource.MOBILE,
    });
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(1, 12));
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(1, 13));
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(1, 14));
    await createEvent(AnalyticsEventType.PANEL_USED, window.at(2, 12));
    await createEvent(AnalyticsEventType.SESSION_STARTED, window.at(4, 12));
    await createEvent(AnalyticsEventType.SESSION_STARTED, window.at(4, 13));
    await createEvent(
      AnalyticsEventType.PANEL_USED,
      new Date(window.from.getTime() - DAY_MS),
    );
    await createEvent(AnalyticsEventType.PANEL_USED, window.to);

    const response = await request(app.getHttpServer())
      .get(dailyUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(periodQuery(window))
      .expect(200);

    expect(response.body.from).toBe(window.from.toISOString());
    expect(response.body.to).toBe(window.to.toISOString());
    expect(response.body.items).toHaveLength(5);
    expect(response.body.items.map((item: { date: string }) => item.date)).toEqual([
      window.from.toISOString().slice(0, 10),
      new Date(window.from.getTime() + DAY_MS).toISOString().slice(0, 10),
      new Date(window.from.getTime() + 2 * DAY_MS).toISOString().slice(0, 10),
      new Date(window.from.getTime() + 3 * DAY_MS).toISOString().slice(0, 10),
      new Date(window.from.getTime() + 4 * DAY_MS).toISOString().slice(0, 10),
    ]);
    expect(response.body.items[0]).toEqual({
      date: window.from.toISOString().slice(0, 10),
      panelClicks: 2,
      routesBuilt: 0,
      qrScans: 1,
      sessions: 0,
    });
    expect(response.body.items[1]).toEqual({
      date: new Date(window.from.getTime() + DAY_MS).toISOString().slice(0, 10),
      panelClicks: 0,
      routesBuilt: 3,
      qrScans: 0,
      sessions: 0,
    });
    expect(response.body.items[2]).toMatchObject({ panelClicks: 1 });
    expect(response.body.items[3]).toEqual({
      date: new Date(window.from.getTime() + 3 * DAY_MS).toISOString().slice(0, 10),
      panelClicks: 0,
      routesBuilt: 0,
      qrScans: 0,
      sessions: 0,
    });
    expect(response.body.items[4]).toMatchObject({ sessions: 2 });
  });

  it("defaults the daily series to the last 30 days", async () => {
    const response = await request(app.getHttpServer())
      .get(dailyUrl)
      .set(auth(tokens["analytics-viewer"]))
      .expect(200);

    expect(response.body.items).toHaveLength(30);
    expect(new Date(response.body.from).getTime()).toBeLessThan(
      new Date(response.body.to).getTime(),
    );
  });

  it("returns 24 hourly buckets aggregated by hour of day", async () => {
    const window = nextWindow(1);
    const atNine = window.at(0, 9);
    const atNineThirty = new Date(atNine.getTime() + 60_000);
    const atEighteen = window.at(0, 18);
    const atTwentyThree = window.at(0, 23);
    await createEvent(AnalyticsEventType.PANEL_USED, atNine);
    await createEvent(AnalyticsEventType.PANEL_USED, atNineThirty);
    await createEvent(AnalyticsEventType.ROUTE_BUILT, atEighteen);
    await createEvent(AnalyticsEventType.QR_SCANNED, atEighteen, {
      source: AnalyticsSource.MOBILE,
    });
    await createEvent(AnalyticsEventType.SEARCH_QUERY, atTwentyThree, {
      source: AnalyticsSource.MOBILE,
      query: "coffee",
    });
    await createEvent(
      AnalyticsEventType.PANEL_USED,
      new Date(window.to.getTime() + 3_600_000),
    );

    const response = await request(app.getHttpServer())
      .get(hourlyUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(periodQuery(window))
      .expect(200);

    const hourNine = atNine.getUTCHours();
    const hourEighteen = atEighteen.getUTCHours();
    const hourTwentyThree = atTwentyThree.getUTCHours();
    expect(response.body.items).toHaveLength(24);
    expect(response.body.items.map((item: { hour: number }) => item.hour)).toEqual(
      Array.from({ length: 24 }, (_unused, hour) => hour),
    );
    expect(response.body.items[hourNine]).toEqual({
      hour: hourNine,
      events: 2,
    });
    expect(response.body.items[hourEighteen]).toEqual({
      hour: hourEighteen,
      events: 2,
    });
    expect(response.body.items[hourTwentyThree]).toEqual({
      hour: hourTwentyThree,
      events: 1,
    });
    expect(response.body.items[0]).toEqual({ hour: 0, events: 0 });
  });

  it("defaults the hourly series to the last 30 days", async () => {
    const response = await request(app.getHttpServer())
      .get(hourlyUrl)
      .set(auth(tokens["analytics-viewer"]))
      .expect(200);

    expect(response.body.items).toHaveLength(24);
    expect(
      response.body.items.reduce(
        (total: number, item: { events: number }) => total + item.events,
        0,
      ),
    ).toBeGreaterThan(0);
  });

  it("groups routes built by store with safe projections and ordering", async () => {
    const window = nextWindow(1);
    const tenant = await prisma.tenant.create({
      data: { name: prefix + " tenant " + unique("tenant"), isActive: true },
    });
    const category = await prisma.category.create({
      data: {
        name: prefix + " category",
        slug: prefix + "-category-" + unique("slug"),
        isActive: true,
      },
    });
    const createStore = async (label: string, withFloor: boolean) =>
      prisma.store.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          name: prefix + " " + label,
          slug: prefix + "-" + label + "-" + unique("slug"),
          isActive: true,
          isVisible: true,
          ...(withFloor ? { floorId } : {}),
        },
        select: { id: true, name: true, slug: true },
      });

    const storeA = await createStore("store-a", true);
    const storeB = await createStore("store-b", false);
    const storeC = await createStore("store-c", false);

    for (let index = 0; index < 3; index += 1) {
      await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 10), {
        storeId: storeA.id,
      });
    }
    for (let index = 0; index < 2; index += 1) {
      await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 11), {
        storeId: storeB.id,
      });
    }
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 12), {
      storeId: storeC.id,
    });
    await createEvent(AnalyticsEventType.ROUTE_BUILT, window.at(0, 13), {
      storeId: null,
    });
    await createEvent(AnalyticsEventType.STORE_SELECTED, window.at(0, 14), {
      source: AnalyticsSource.MOBILE,
      storeId: storeA.id,
    });
    await createEvent(
      AnalyticsEventType.ROUTE_BUILT,
      new Date(window.to.getTime() + DAY_MS),
      { storeId: storeC.id },
    );

    const response = await request(app.getHttpServer())
      .get(routesByStoreUrl)
      .set(auth(tokens["ads-manager"]))
      .query(periodQuery(window))
      .expect(200);

    expect(response.body.from).toBe(window.from.toISOString());
    expect(response.body.to).toBe(window.to.toISOString());
    expect(response.body.items).toEqual([
      {
        storeId: storeA.id,
        store: {
          id: storeA.id,
          name: storeA.name,
          slug: storeA.slug,
          floorNumber,
        },
        routesBuilt: 3,
      },
      {
        storeId: storeB.id,
        store: {
          id: storeB.id,
          name: storeB.name,
          slug: storeB.slug,
          floorNumber: null,
        },
        routesBuilt: 2,
      },
      {
        storeId: storeC.id,
        store: {
          id: storeC.id,
          name: storeC.name,
          slug: storeC.slug,
          floorNumber: null,
        },
        routesBuilt: 1,
      },
    ]);
  });

  it("returns an empty list for a period without route events", async () => {
    const window = nextWindow(1);
    const response = await request(app.getHttpServer())
      .get(routesByStoreUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(periodQuery(window))
      .expect(200);

    expect(response.body).toEqual({
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      items: [],
    });
  });

  it.each([
    ["invalid datetime", { from: "not-a-date" }],
    [
      "equal range boundaries",
      { from: "2080-01-01T00:00:00.000Z", to: "2080-01-01T00:00:00.000Z" },
    ],
    [
      "reversed range",
      { from: "2080-01-02T00:00:00.000Z", to: "2080-01-01T00:00:00.000Z" },
    ],
    ["unsupported source", { source: AnalyticsSource.ADMIN }],
    ["unknown panel filter", { panelId: "" }],
  ])("returns 400 for %s", async (_label, query) => {
    await request(app.getHttpServer())
      .get(summaryUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(query)
      .expect(400);
    await request(app.getHttpServer())
      .get(dailyUrl)
      .set(auth(tokens["analytics-viewer"]))
      .query(query)
      .expect(400);
  });
});
