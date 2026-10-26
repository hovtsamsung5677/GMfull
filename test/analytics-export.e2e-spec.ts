import request from "supertest";
import { E2ECtx, createE2EApp, loginAsSuperAdmin, teardownE2EApp } from "./e2e-helpers";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ctx: E2ECtx = {} as E2ECtx;

describe("Analytics export (e2e)", () => {
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
      data: { name: `E2E X Tenant ${runId}`, isActive: true },
      select: { id: true },
    });
    tenantId = tenant.id;

    const floor = await prisma.floor.create({
      data: {
        number: 4_000_000 + Math.floor(Math.random() * 900_000),
        name: `E2E X Floor ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });

    const routeNode = await prisma.routeNode.create({
      data: {
        floorId: floor.id,
        type: "PANEL",
        name: `E2E X Node ${runId}`,
        x: 0,
        y: 0,
        isActive: true,
      },
      select: { id: true },
    });

    const panel = await prisma.panel.create({
      data: {
        code: `e2e-x-panel-${runId}`,
        name: `E2E X Panel ${runId}`,
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
        name: `E2E X Store ${runId}`,
        slug: `e2e-x-store-${runId}`,
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    storeId = store.id;

    const category = await prisma.category.create({
      data: {
        name: `E2E X Category ${runId}`,
        slug: `e2e-x-category-${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    categoryId = category.id;

    const now = new Date();
    await prisma.analyticsEvent.createMany({
      data: [
        { type: "PANEL_USED", panelId, source: "PANEL", createdAt: now },
        { type: "ROUTE_BUILT", panelId, storeId, source: "PANEL", createdAt: now },
        { type: "CATEGORY_SELECTED", panelId, categoryId, source: "PANEL", createdAt: now },
        {
          type: "SEARCH_QUERY",
          panelId,
          query: "export-query",
          source: "PANEL",
          payload: { resultCount: 0 },
          createdAt: now,
        },
        { type: "STORE_CARD_VIEWED", panelId, storeId, source: "PANEL", createdAt: now },
        { type: "AD_IMPRESSION", panelId, source: "PANEL", createdAt: now },
        { type: "AD_CLICK", panelId, source: "PANEL", createdAt: now },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    try {
      if (ctx.prisma) {
        if (panelId) {
          await ctx.prisma.analyticsEvent.deleteMany({ where: { panelId } });
          await ctx.prisma.panel.deleteMany({ where: { id: panelId } });
        }
        if (categoryId) {
          await ctx.prisma.category.deleteMany({ where: { id: categoryId } });
        }
        if (storeId) {
          await ctx.prisma.store.deleteMany({ where: { id: storeId } });
        }
        await ctx.prisma.floor.deleteMany({
          where: { name: `E2E X Floor ${runId}` },
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

  const csvHeaders = (body: Buffer) => body.toString("utf8").split("\n")[0] ?? "";

   function expectCsvFile(res: request.Response, stem: string): void {
     expect(res.status).toBe(200);
     const ct = res.headers["content-type"] as string;
     expect(ct).toContain("text/csv");
     const disposition = res.headers["content-disposition"] as string;
     expect(disposition).toContain("attachment");
     expect(disposition).toContain(`${stem}.csv`);
     expect(Buffer.isBuffer(res.body)).toBe(true);
     expect(res.body.length).toBeGreaterThan(0);
   }

  it("rejects exports without a JWT", async () => {
    await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/daily")
      .expect(401);
  });

  it("exports navigation daily report as CSV", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/daily")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, format: "csv", from: "2000-01-01T00:00:00.000Z" })
      .responseType("blob");

    expectCsvFile(res, "navigation-daily");
    const header = csvHeaders(res.body as Buffer);
    expect(header).toContain("Date");
    expect(header).toContain("Panel Clicks");
    expect(header).toContain("Routes Built");
  });

  it("exports navigation daily report as XLSX", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/daily")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, format: "xlsx", from: "2000-01-01T00:00:00.000Z" })
      .responseType("blob");

    expect(res.status).toBe(200);
    const ct = res.headers["content-type"] as string;
    expect(ct).toContain("application/vnd.openxmlformats");
    const disposition = res.headers["content-disposition"] as string;
    expect(disposition).toContain("navigation-daily.xlsx");
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).length).toBeGreaterThan(0);
  });

  it("exports routes-by-store as CSV", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/routes-by-store")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, format: "csv", from: "2000-01-01T00:00:00.000Z" })
      .responseType("blob");

    expectCsvFile(res, "navigation-routes-by-store");
    expect(csvHeaders(res.body as Buffer)).toContain("Routes Built");
  });

  it("exports popular categories as CSV", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/popular-categories")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, format: "csv", from: "2000-01-01T00:00:00.000Z" })
      .responseType("blob");

    expectCsvFile(res, "navigation-popular-categories");
    expect(csvHeaders(res.body as Buffer)).toContain("Selections");
  });

  it("exports search queries as CSV", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/search-queries")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, format: "csv", from: "2000-01-01T00:00:00.000Z" })
      .responseType("blob");

    expectCsvFile(res, "navigation-search-queries");
    expect(csvHeaders(res.body as Buffer)).toContain("Search Query");
  });

  it("exports card-to-route conversion as CSV (single row)", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/conversion/card-to-route")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({ panelId, format: "csv", from: "2000-01-01T00:00:00.000Z" })
      .responseType("blob");

    expectCsvFile(res, "navigation-conversion-card-to-route");
    expect(csvHeaders(res.body as Buffer)).toContain("Card Views");
  });

  it("exports ads breakdown as CSV", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/ads/breakdown")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
       .query({
        panelId,
        groupBy: "panel",
        format: "csv",
        from: "2000-01-01T00:00:00.000Z",
      })
      .responseType("blob");

    expectCsvFile(res, "ads-breakdown");
    expect(csvHeaders(res.body as Buffer)).toContain("CTR");
  });

  it("defaults export format to CSV when omitted", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/export/navigation/daily")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" });

    const disposition = res.headers["content-disposition"] as string;
    expect(disposition).toContain("navigation-daily.csv");
  });
});
