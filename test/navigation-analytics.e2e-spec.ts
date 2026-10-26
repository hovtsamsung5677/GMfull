import request from "supertest";
import { E2ECtx, createE2EApp, loginAsSuperAdmin, teardownE2EApp } from "./e2e-helpers";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ctx: E2ECtx = {} as E2ECtx;

const panelCode = `e2e-panel-${runId}`;
const todayIso = new Date().toISOString().slice(0, 10);

describe("Navigation analytics (e2e)", () => {
  let tenantId: string;
  let storeId: string;
  let panelId: string;
  let categoryId: string;

  beforeAll(async () => {
    const { app, prisma } = await createE2EApp();
    ctx.app = app;
    ctx.prisma = prisma;
    const { session, createdRole } = await loginAsSuperAdmin(app, prisma, runId);
    ctx.session = session;
    ctx.createdRole = createdRole;

    const tenant = await prisma.tenant.create({
      data: { name: `E2E Tenant ${runId}`, isActive: true },
      select: { id: true },
    });
    tenantId = tenant.id;

    const floor = await prisma.floor.create({
      data: {
        number: 2_000_000 + Math.floor(Math.random() * 900_000),
        name: `E2E Nav Floor ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });

    const routeNode = await prisma.routeNode.create({
      data: {
        floorId: floor.id,
        type: "PANEL",
        name: `E2E Nav Node ${runId}`,
        x: 0,
        y: 0,
        isActive: true,
      },
      select: { id: true },
    });

    const panel = await prisma.panel.create({
      data: {
        code: panelCode,
        name: `E2E Nav Panel ${runId}`,
        floorId: floor.id,
        routeNodeId: routeNode.id,
        isActive: true,
        status: "OFFLINE",
      },
      select: { id: true },
    });
    panelId = panel.id;

    const store = await prisma.store.create({
      data: {
        tenantId,
        floorId: floor.id,
        name: `E2E Store ${runId}`,
        slug: `e2e-store-${runId}`,
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    storeId = store.id;

    const category = await prisma.category.create({
      data: {
        name: `E2E Category ${runId}`,
        slug: `e2e-category-${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    categoryId = category.id;

    const now = new Date();
    const ev = prisma.analyticsEvent;
    const base = {
      source: "PANEL" as const,
      createdAt: now,
    };

    await ev.createMany({
      data: [
        { type: "PANEL_USED", panelId, source: base.source, createdAt: now },
        { type: "PANEL_USED", panelId, source: base.source, createdAt: now },
        { type: "QR_SCANNED", panelId, source: base.source, createdAt: now },
        { type: "SESSION_STARTED", panelId, sessionId: "nav-sess-a", source: base.source, createdAt: now },
        { type: "SESSION_STARTED", panelId, sessionId: "nav-sess-b", source: base.source, createdAt: now },
        { type: "ROUTE_BUILT", panelId, storeId, sessionId: "card-sess", source: base.source, createdAt: now },
        { type: "STORE_CARD_VIEWED", panelId, storeId, sessionId: "card-sess", source: base.source, createdAt: now },
        { type: "STORE_CARD_VIEWED", panelId, storeId, sessionId: "card-sess", source: base.source, createdAt: now },
        { type: "CATEGORY_SELECTED", panelId, categoryId, source: base.source, createdAt: now },
        { type: "CATEGORY_SELECTED", panelId, categoryId, source: base.source, createdAt: now },
        {
          type: "SEARCH_QUERY",
          panelId,
          query: "zero-result-query",
          source: base.source,
          payload: { resultCount: 0 },
          createdAt: now,
        },
        {
          type: "SEARCH_QUERY",
          panelId,
          query: "results-here-query",
          source: base.source,
          payload: { resultCount: 3 },
          createdAt: now,
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    try {
      if (ctx.prisma) {
        await ctx.prisma.analyticsEvent.deleteMany({ where: { panelId } });
        if (categoryId) {
          await ctx.prisma.category.deleteMany({ where: { id: categoryId } });
        }
        if (storeId) {
          await ctx.prisma.store.deleteMany({ where: { id: storeId } });
        }
        if (panelId) {
          await ctx.prisma.panel.deleteMany({ where: { id: panelId } });
        }
        await ctx.prisma.floor.deleteMany({
          where: { name: `E2E Nav Floor ${runId}` },
        });
        if (tenantId) {
          await ctx.prisma.tenant.deleteMany({ where: { id: tenantId } });
        }
      }
    } finally {
      await teardownE2EApp(ctx.app, ctx.prisma, {
        userId: ctx.session.userId,
        roleId: ctx.session.roleId,
        createdRole: ctx.createdRole,
      });
    }
  });

  it("rejects navigation analytics without a JWT", async () => {
    await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/summary")
      .expect(401);
  });

  it("rejects an invalid period (from >= to)", async () => {
    await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/summary")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ from: "2026-10-01T00:00:00.000Z", to: "2026-10-01T00:00:00.000Z" })
      .expect(400);
  });

  it("returns navigation summary for the test panel", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/summary")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(res.body.panelClicks).toBe(2);
    expect(res.body.routesBuilt).toBe(1);
    expect(res.body.qrScans).toBe(1);
    expect(res.body.sessionsStarted).toBe(2);
    expect(res.body.mobileOpened).toBe(0);
    expect(res.body.uniqueSessions).toBeGreaterThanOrEqual(1);
    expect(res.body.panelClicksToday).toBe(2);
  });

  it("returns a zero-filled daily series including today", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/daily")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const today = res.body.items.find((i: { date: string }) => i.date === todayIso);
    expect(today).toBeTruthy();
    expect(today.panelClicks).toBe(2);
    expect(today.qrScans).toBe(1);
    expect(today.routesBuilt).toBe(1);
    expect(today.sessions).toBe(2);
  });

  it("returns 24 hourly buckets", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/hourly")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(res.body.items).toHaveLength(24);
    expect(res.body.items.map((i: { hour: number }) => i.hour)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ]);
    const total = res.body.items.reduce((sum: number, i: { events: number }) => sum + i.events, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("groups routes built by store", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/routes-by-store")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    const row = res.body.items.find((i: { storeId: string }) => i.storeId === storeId);
    expect(row).toBeTruthy();
    expect(row.routesBuilt).toBe(1);
    expect(row.store).toEqual(
      expect.objectContaining({ id: storeId, slug: `e2e-store-${runId}` }),
    );
  });

  it("groups popular categories by selection count", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/popular-categories")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    const row = res.body.items.find((i: { categoryId: string }) => i.categoryId === categoryId);
    expect(row).toBeTruthy();
    expect(row.selections).toBe(2);
  });

   it("returns only zero-result search queries when noResults=true", async () => {
     const res = await request(ctx.app.getHttpServer())
       .get("/api/admin/analytics/navigation/search-queries")
       .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, noResults: true, from: "2000-01-01T00:00:00.000Z" })
       .expect(200);

     expect(res.body.noResultsFilter).toBe(true);

    expect(res.body.items.map((i: { query: string }) => i.query)).toEqual([
      "zero-result-query",
    ]);
  });

  it("returns all search queries (noResults omitted)", async () => {
     const res = await request(ctx.app.getHttpServer())
       .get("/api/admin/analytics/navigation/search-queries")
       .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
       .expect(200);

    const queries = res.body.items.map((i: { query: string }) => i.query);
    expect(queries).toContain("zero-result-query");
    expect(queries).toContain("results-here-query");
  });

  it("computes card-to-route conversion funnel", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/navigation/conversion/card-to-route")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(res.body.cardViews).toBeGreaterThanOrEqual(2);
    expect(res.body.routesFromCardSessions).toBeGreaterThanOrEqual(1);
    expect(res.body.conversionRate).toBeGreaterThan(0);
  });

  it("keeps the panel online after the analytics queries did not mutate it", async () => {
    const panel = await ctx.prisma.panel.findUnique({
      where: { code: panelCode },
      select: { status: true },
    });
    expect(panel?.status).toBe("OFFLINE");
  });
});
