import request from "supertest";
import { E2ECtx, createE2EApp, loginAsSuperAdmin, teardownE2EApp } from "./e2e-helpers";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ctx: E2ECtx = {} as E2ECtx;

describe("Panels API (e2e)", () => {
  let floorId: string;
  let routeNodeId: string;
  let panelId: string;

  beforeAll(async () => {
    const { app, prisma } = await createE2EApp();
    ctx.app = app;
    ctx.prisma = prisma;
    const { session, createdRole } = await loginAsSuperAdmin(app, prisma, runId);
    ctx.session = session;
    ctx.createdRole = createdRole;

    const floorNumber = 1_000_000 + Math.floor(Math.random() * 900_000);

    const floor = await prisma.floor.create({
      data: { number: floorNumber, name: `E2E Floor ${runId}`, isActive: true },
      select: { id: true },
    });
    floorId = floor.id;

    const routeNode = await prisma.routeNode.create({
      data: {
        floorId,
        type: "PANEL",
        name: `E2E Node ${runId}`,
        x: 0,
        y: 0,
        isActive: true,
      },
      select: { id: true },
    });
    routeNodeId = routeNode.id;

    const panel = await prisma.panel.create({
      data: {
        code: `e2e-panel-${runId}`,
        name: `E2E Panel ${runId}`,
        floorId,
        routeNodeId,
        isActive: true,
        status: "OFFLINE",
      },
      select: { id: true },
    });
    panelId = panel.id;
  });

  afterAll(async () => {
    try {
      if (ctx.prisma && panelId) {
        await ctx.prisma.panel.deleteMany({ where: { id: panelId } });
      }
      if (ctx.prisma && routeNodeId) {
        await ctx.prisma.routeNode.deleteMany({ where: { id: routeNodeId } });
      }
      if (ctx.prisma && floorId) {
        await ctx.prisma.floor.deleteMany({ where: { id: floorId } });
      }
    } finally {
      await teardownE2EApp(ctx.app, ctx.prisma, {
        userId: ctx.session.userId,
        roleId: ctx.session.roleId,
        createdRole: ctx.createdRole,
      });
    }
  });

  it("resolves the panel installed at a route node", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/public/panels/by-node/${routeNodeId}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        id: panelId,
        code: `e2e-panel-${runId}`,
        name: `E2E Panel ${runId}`,
        floorId,
      }),
    );
  });

  it("returns 404 for an unknown route node", async () => {
    await request(ctx.app.getHttpServer())
      .get("/api/public/panels/by-node/nonexistent-node")
      .expect(404);
  });

  it("records a heartbeat and refreshes lastSeenAt", async () => {
    const before = await ctx.prisma.panel.findUnique({
      where: { id: panelId },
      select: { lastSeenAt: true, status: true, appVersion: true, usedAt: true },
    });

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/public/panels/${panelId}/heartbeat`)
      .send({ status: "ONLINE", appVersion: "1.0.0-test" })
      .expect(200);

    expect(res.body.id).toBe(panelId);
    expect(res.body.status).toBe("ONLINE");
    expect(res.body.processedAt).toBeTruthy();

    const after = await ctx.prisma.panel.findUnique({
      where: { id: panelId },
      select: { lastSeenAt: true, status: true, appVersion: true },
    });
    expect(after?.status).toBe("ONLINE");
    expect(after?.appVersion).toBe("1.0.0-test");
    expect(after?.lastSeenAt?.getTime()).toBeGreaterThanOrEqual(before?.lastSeenAt?.getTime() ?? 0);
  });

  it("updates lastSeenAt without specifying status", async () => {
    const before = await ctx.prisma.panel.findUnique({
      where: { id: panelId },
      select: { lastSeenAt: true },
    });

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/public/panels/${panelId}/heartbeat`)
      .send({})
      .expect(200);

    expect(res.body.id).toBe(panelId);
    expect(res.body.lastSeenAt).not.toBeNull();

    const after = await ctx.prisma.panel.findUnique({
      where: { id: panelId },
      select: { lastSeenAt: true },
    });
    expect(after?.lastSeenAt?.getTime()).toBeGreaterThanOrEqual(
      before?.lastSeenAt?.getTime() ?? 0,
    );
  });

  it("returns 200 when status is omitted (payload is optional fields)", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/public/panels/${panelId}/heartbeat`)
      .send({})
      .expect(200);
    expect(res.body).toHaveProperty("id", panelId);
  });

  it("returns 404 for a non-existent panel", async () => {
    await request(ctx.app.getHttpServer())
      .post("/api/public/panels/nonexistent-panel/heartbeat")
      .send({})
      .expect(404);
  });

  it("returns 404 for an inactive panel", async () => {
    const inactive = await ctx.prisma.panel.create({
      data: {
        code: `e2e-inactive-${runId}`,
        name: `E2E Inactive ${runId}`,
        floorId,
        isActive: false,
        status: "OFFLINE",
      },
      select: { id: true },
    });

    try {
      await request(ctx.app.getHttpServer())
        .post(`/api/public/panels/${inactive.id}/heartbeat`)
        .send({})
        .expect(404);
    } finally {
      await ctx.prisma.panel.deleteMany({ where: { id: inactive.id } });
    }
  });

  it("rejects an invalid status enum value with 400", async () => {
    await request(ctx.app.getHttpServer())
      .post(`/api/public/panels/${panelId}/heartbeat`)
      .send({ status: "FROBNICATED" })
      .expect(400);
  });

  it("heartbeat is unauthenticated", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/public/panels/${panelId}/heartbeat`)
      .send({})
      .expect(200);
    expect(res.body.id).toBe(panelId);
  });
});
