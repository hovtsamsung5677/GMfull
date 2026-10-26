import request from "supertest";
import { E2ECtx, createE2EApp, loginAsSuperAdmin, teardownE2EApp } from "./e2e-helpers";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ctx: E2ECtx = {} as E2ECtx;

describe("Advertising analytics (e2e)", () => {
  let panelId: string;

  beforeAll(async () => {
    const { app, prisma } = await createE2EApp();
    ctx.app = app;
    ctx.prisma = prisma;
    const { session, createdRole } = await loginAsSuperAdmin(app, prisma, runId);
    ctx.session = session;
    ctx.createdRole = createdRole;

    const floor = await prisma.floor.create({
      data: {
        number: 3_000_000 + Math.floor(Math.random() * 900_000),
        name: `E2E Ad Floor ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });

    const routeNode = await prisma.routeNode.create({
      data: {
        floorId: floor.id,
        type: "PANEL",
        name: `E2E Ad Node ${runId}`,
        x: 0,
        y: 0,
        isActive: true,
      },
      select: { id: true },
    });

    const panel = await prisma.panel.create({
      data: {
        code: `e2e-ad-panel-${runId}`,
        name: `E2E Ad Panel ${runId}`,
        floorId: floor.id,
        routeNodeId: routeNode.id,
        isActive: true,
        status: "OFFLINE",
      },
      select: { id: true },
    });
    panelId = panel.id;

    const now = new Date();
    await prisma.analyticsEvent.createMany({
      data: [
        { type: "AD_IMPRESSION", panelId, source: "PANEL", createdAt: now },
        { type: "AD_IMPRESSION", panelId, source: "PANEL", createdAt: now },
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
        await ctx.prisma.floor.deleteMany({
          where: { name: `E2E Ad Floor ${runId}` },
        });
      }
    } finally {
      await teardownE2EApp(ctx.app, ctx.prisma, {
        userId: ctx.session.userId,
        roleId: ctx.session.roleId,
        createdRole: ctx.createdRole,
      });
    }
  });

  it("rejects ad analytics without a JWT", async () => {
    await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/ads/summary")
      .expect(401);
  });

  it("returns advertising summary for the test panel", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/ads/summary")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(res.body.impressions).toBe(3);
    expect(res.body.clicks).toBe(1);
    expect(res.body.ctr).toBeCloseTo(1 / 3, 5);
  });

  it("groups ad events by panel", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/ads/breakdown")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, groupBy: "panel", from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(res.body.groupBy).toBe("panel");
    expect(Array.isArray(res.body.items)).toBe(true);
    const row = res.body.items.find((i: { entityId: string }) => i.entityId === panelId);
    expect(row).toBeTruthy();
    expect(row.impressions).toBe(3);
    expect(row.clicks).toBe(1);
  });

  it("returns impression-to-click conversion", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/ads/conversion")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(200);

    expect(res.body.impressions).toBe(3);
    expect(res.body.clicks).toBe(1);
    expect(res.body.conversionRate).toBeCloseTo(1 / 3, 5);
  });

  it("requires groupBy on the breakdown endpoint", async () => {
    await request(ctx.app.getHttpServer())
      .get("/api/admin/analytics/ads/breakdown")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .query({ panelId, from: "2000-01-01T00:00:00.000Z" })
      .expect(400);
  });
});
