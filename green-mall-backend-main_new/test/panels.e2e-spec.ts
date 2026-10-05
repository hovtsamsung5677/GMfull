import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AdPlacement,
  AnalyticsEventType,
  AnalyticsSource,
  PanelStatus,
  Prisma,
  RouteNodeType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Panels admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "panels-e2e-" + runId;
  const password = "PanelsE2e12345!";
  const panelsUrl = "/api/admin/panels";
  const panelUrl = (id: string) => panelsUrl + "/" + id;
  const routeNodeUrl = (id: string) =>
    "/api/admin/route-nodes/" + id;
  const auth = (token: string) => ({ Authorization: "Bearer " + token });
  const createdRoleIds: string[] = [];
  const tokens: Record<string, string> = {};
  let sequence = 0;
  let floorSequence = 0;

  let firstFloorId: string;
  let secondFloorId: string;
  let baselineRouteNodeId: string;
  let nonPanelRouteNodeId: string;
  let baselinePanelId: string;
  let listInactiveId: string;
  let listAlphaId: string;
  let listBetaId: string;

  const unique = (label: string) => label + "-" + ++sequence;

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
        description: "Temporary role created by Panels e2e tests",
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
        name: "Panels E2E " + label,
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

  async function createFloor(label: string) {
    floorSequence += 1;
    return prisma.floor.create({
      data: {
        number:
          -Math.floor((Date.now() + process.pid * 1000) % 1_500_000_000) -
          floorSequence,
        name: prefix + " " + label,
        isActive: true,
      },
    });
  }

  async function createRouteNode(
    floorId: string,
    label: string,
    type: RouteNodeType = RouteNodeType.PANEL,
  ) {
    const suffix = unique(label);
    return prisma.routeNode.create({
      data: {
        floorId,
        type,
        name: prefix + " " + suffix,
        code: prefix + "-" + suffix,
        x: sequence * 10,
        y: sequence * 20,
        z: sequence,
        isActive: true,
      },
    });
  }

  async function createPanel(
    label: string,
    data: Partial<Prisma.PanelUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.panel.create({
      data: {
        code: prefix + "-" + suffix,
        name: prefix + " " + suffix,
        isActive: false,
        ...data,
      },
    });
  }

  function buildPanel(
    floorId: string,
    routeNodeId: string,
    overrides: Record<string, unknown> = {},
  ) {
    const suffix = unique("api-panel");
    return {
      code: prefix + "-" + suffix,
      name: prefix + " " + suffix,
      description: "Isolated navigation Panel created by e2e.",
      floorId,
      routeNodeId,
      location: { coordinates: [100, 200, 0] },
      isActive: true,
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
    const passwordHash = await bcrypt.hash(password, 10);

    await createUserAndLogin("SUPER_ADMIN", "super-admin", passwordHash);
    await createUserAndLogin("MALL_ADMIN", "mall-admin", passwordHash);
    await createUserAndLogin(
      "CONTENT_MANAGER",
      "content-manager",
      passwordHash,
    );
    await createUserAndLogin("ADS_MANAGER", "ads-manager", passwordHash);
    await createUserAndLogin(
      "ANALYTICS_VIEWER",
      "analytics-viewer",
      passwordHash,
    );

    const firstFloor = await createFloor("First floor");
    const secondFloor = await createFloor("Second floor");
    firstFloorId = firstFloor.id;
    secondFloorId = secondFloor.id;

    const baselineRouteNode = await createRouteNode(
      firstFloorId,
      "baseline-route-node",
    );
    baselineRouteNodeId = baselineRouteNode.id;
    const nonPanelRouteNode = await createRouteNode(
      firstFloorId,
      "non-panel-route-node",
      RouteNodeType.ROUTE_POINT,
    );
    nonPanelRouteNodeId = nonPanelRouteNode.id;

    const baselinePanel = await createPanel("baseline-panel", {
      name: prefix + " Baseline Panel",
      description: "Safe projection baseline",
      status: PanelStatus.ONLINE,
      floorId: firstFloorId,
      routeNodeId: baselineRouteNodeId,
      location: { zone: "main-entrance" },
      appVersion: "9.9.9-e2e",
      lastSeenAt: new Date(),
      isActive: true,
    });
    baselinePanelId = baselinePanel.id;

    const inactive = await createPanel("list-inactive", {
      name: "A " + prefix + " list-scope inactive",
      status: PanelStatus.OFFLINE,
      floorId: secondFloorId,
      isActive: false,
    });
    listInactiveId = inactive.id;

    const alphaNode = await createRouteNode(firstFloorId, "list-alpha-node");
    const alpha = await createPanel("list-alpha", {
      name: "B " + prefix + " list-scope alpha",
      status: PanelStatus.ONLINE,
      floorId: firstFloorId,
      routeNodeId: alphaNode.id,
      isActive: true,
    });
    listAlphaId = alpha.id;

    const betaNode = await createRouteNode(firstFloorId, "list-beta-node");
    const beta = await createPanel("list-beta", {
      name: "C " + prefix + " list-scope beta",
      status: PanelStatus.MAINTENANCE,
      floorId: firstFloorId,
      routeNodeId: betaNode.id,
      isActive: true,
    });
    listBetaId = beta.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.analyticsEvent.deleteMany({
          where: {
            OR: [
              { clientEventId: { startsWith: prefix } },
              { panel: { code: { startsWith: prefix } } },
            ],
          },
        });
        await prisma.adSlot.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.routeNode.deleteMany({
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

        const leftovers = await Promise.all([
          prisma.analyticsEvent.count({
            where: { clientEventId: { startsWith: prefix } },
          }),
          prisma.adSlot.count({
            where: { code: { startsWith: prefix } },
          }),
          prisma.panel.count({
            where: { code: { startsWith: prefix } },
          }),
          prisma.routeNode.count({
            where: { code: { startsWith: prefix } },
          }),
          prisma.floor.count({
            where: { name: { startsWith: prefix } },
          }),
          prisma.user.count({
            where: { email: { startsWith: prefix } },
          }),
          prisma.role.count({
            where: { id: { in: createdRoleIds } },
          }),
        ]);

        expect(leftovers).toEqual([0, 0, 0, 0, 0, 0, 0]);
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("returns 401 without JWT for every endpoint", async () => {
    await request(app.getHttpServer()).get(panelsUrl).expect(401);
    await request(app.getHttpServer())
      .get(panelUrl(baselinePanelId))
      .expect(401);
    await request(app.getHttpServer())
      .post(panelsUrl)
      .send(buildPanel(firstFloorId, baselineRouteNodeId))
      .expect(401);
    await request(app.getHttpServer())
      .patch(panelUrl(baselinePanelId))
      .send({ name: "Unauthorized" })
      .expect(401);
    await request(app.getHttpServer())
      .delete(panelUrl(baselinePanelId))
      .expect(401);
  });

  it.each([
    ["SUPER_ADMIN", "super-admin"],
    ["MALL_ADMIN", "mall-admin"],
  ])("allows %s to read and write Panels", async (_role, label) => {
    const token = tokens[label];

    await request(app.getHttpServer())
      .get(panelsUrl)
      .set(auth(token))
      .expect(200);
    await request(app.getHttpServer())
      .get(panelUrl(baselinePanelId))
      .set(auth(token))
      .expect(200);

    const node = await createRouteNode(firstFloorId, "role-" + label);
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(token))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);

    await request(app.getHttpServer())
      .patch(panelUrl(created.body.id as string))
      .set(auth(token))
      .send({ description: "Updated by " + label })
      .expect(200);
    await request(app.getHttpServer())
      .delete(panelUrl(created.body.id as string))
      .set(auth(token))
      .expect(200);
  });

  it.each([
    ["CONTENT_MANAGER", "content-manager"],
    ["ADS_MANAGER", "ads-manager"],
    ["ANALYTICS_VIEWER", "analytics-viewer"],
  ])("returns 403 for %s on every endpoint", async (_role, label) => {
    const token = tokens[label];

    await request(app.getHttpServer())
      .get(panelsUrl)
      .set(auth(token))
      .expect(403);
    await request(app.getHttpServer())
      .get(panelUrl(baselinePanelId))
      .set(auth(token))
      .expect(403);
    await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(token))
      .send(buildPanel(firstFloorId, baselineRouteNodeId))
      .expect(403);
    await request(app.getHttpServer())
      .patch(panelUrl(baselinePanelId))
      .set(auth(token))
      .send({ name: "Forbidden" })
      .expect(403);
    await request(app.getHttpServer())
      .delete(panelUrl(baselinePanelId))
      .set(auth(token))
      .expect(403);
  });

  it("creates a normalized active Panel with safe runtime defaults", async () => {
    const node = await createRouteNode(firstFloorId, "normalized-create-node");
    const response = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send({
        code: "  " + prefix.toUpperCase() + "-MAIN  ",
        name: "  Main    Entrance\nPanel  ",
        description: "  Main entrance configuration  ",
        floorId: firstFloorId,
        routeNodeId: node.id,
        location: { coordinates: [10, 20, 0] },
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        code: prefix + "-main",
        name: "Main Entrance Panel",
        description: "Main entrance configuration",
        status: PanelStatus.OFFLINE,
        floorId: firstFloorId,
        routeNodeId: node.id,
        location: { coordinates: [10, 20, 0] },
        appVersion: null,
        lastSeenAt: null,
        isActive: true,
      }),
    );
    expect(response.body.floor).toEqual(
      expect.objectContaining({ id: firstFloorId }),
    );
    expect(response.body.routeNode).toEqual(
      expect.objectContaining({
        id: node.id,
        floorId: firstFloorId,
        type: RouteNodeType.PANEL,
      }),
    );
  });

  it("returns 409 for a duplicate normalized code", async () => {
    const baseline = await prisma.panel.findUniqueOrThrow({
      where: { id: baselinePanelId },
      select: { code: true },
    });

    await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send({
        code: "  " + baseline.code.toUpperCase() + "  ",
        name: "Duplicate Panel",
        floorId: null,
        routeNodeId: null,
        isActive: false,
      })
      .expect(409);
  });

  it.each([
    ["internal spaces", "invalid code"],
    ["underscore", "invalid_code"],
    ["repeated separator", "invalid--code"],
    ["empty after normalization", "   "],
  ])("rejects Panel code with %s", async (_case, code) => {
    await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send({
        code,
        name: "Invalid code Panel",
        isActive: false,
      })
      .expect(400);
  });

  it("returns 404 for nonexistent Floor and RouteNode references", async () => {
    await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(
        buildPanel(firstFloorId, baselineRouteNodeId, {
          code: prefix + "-missing-floor",
          floorId: "missing-floor-" + runId,
          routeNodeId: null,
          isActive: false,
        }),
      )
      .expect(404);

    await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(
        buildPanel(firstFloorId, baselineRouteNodeId, {
          code: prefix + "-missing-route-node",
          routeNodeId: "missing-route-node-" + runId,
          isActive: false,
        }),
      )
      .expect(404);
  });

  it("rejects a RouteNode whose type is not PANEL", async () => {
    const response = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send(
        buildPanel(firstFloorId, nonPanelRouteNodeId, {
          code: prefix + "-wrong-node-type",
        }),
      )
      .expect(400);

    expect(response.body.message).toBe("Route node type must be PANEL");
  });

  it("returns 409 when RouteNode is already assigned to another Panel", async () => {
    const response = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(
        buildPanel(firstFloorId, baselineRouteNodeId, {
          code: prefix + "-duplicate-route-node",
        }),
      )
      .expect(409);

    expect(response.body.message).toBe(
      "Route node is already assigned to a Panel",
    );
  });

  it("rejects a floorId that differs from RouteNode.floorId", async () => {
    const node = await createRouteNode(
      firstFloorId,
      "floor-mismatch-route-node",
    );
    const response = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(
        buildPanel(secondFloorId, node.id, {
          code: prefix + "-floor-mismatch",
        }),
      )
      .expect(400);

    expect(response.body.message).toBe(
      "Panel floorId must match route node floorId",
    );
  });

  it("protects an active Panel from RouteNode type changes by CONTENT_MANAGER", async () => {
    const node = await createRouteNode(
      firstFloorId,
      "active-panel-type-invariant-node",
    );
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .patch(routeNodeUrl(node.id))
      .set(auth(tokens["content-manager"]))
      .send({ type: RouteNodeType.ROUTE_POINT })
      .expect(409);

    expect(conflict.body.message).toBe(
      "Route node update would make its active Panel configuration inconsistent",
    );

    const [storedNode, storedPanel] = await Promise.all([
      prisma.routeNode.findUniqueOrThrow({ where: { id: node.id } }),
      prisma.panel.findUniqueOrThrow({
        where: { id: created.body.id as string },
      }),
    ]);
    expect(storedNode.type).toBe(RouteNodeType.PANEL);
    expect(storedNode.floorId).toBe(firstFloorId);
    expect(storedPanel.isActive).toBe(true);
    expect(storedPanel.floorId).toBe(firstFloorId);
    expect(storedPanel.routeNodeId).toBe(node.id);

    const allowedName = prefix + " safe active Panel node update";
    const allowed = await request(app.getHttpServer())
      .patch(routeNodeUrl(node.id))
      .set(auth(tokens["content-manager"]))
      .send({ name: allowedName })
      .expect(200);
    expect(allowed.body.name).toBe(allowedName);
  });

  it("protects an active Panel from RouteNode floor changes", async () => {
    const node = await createRouteNode(
      firstFloorId,
      "active-panel-floor-invariant-node",
    );
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);

    await request(app.getHttpServer())
      .patch(routeNodeUrl(node.id))
      .set(auth(tokens["content-manager"]))
      .send({ floorId: secondFloorId })
      .expect(409);

    const [storedNode, storedPanel] = await Promise.all([
      prisma.routeNode.findUniqueOrThrow({ where: { id: node.id } }),
      prisma.panel.findUniqueOrThrow({
        where: { id: created.body.id as string },
      }),
    ]);
    expect(storedNode.floorId).toBe(firstFloorId);
    expect(storedPanel.floorId).toBe(firstFloorId);
    expect(storedPanel.routeNodeId).toBe(node.id);
  });

  it("allows RouteNode invariant changes after the linked Panel is inactive", async () => {
    const node = await createRouteNode(
      firstFloorId,
      "inactive-panel-invariant-node",
    );
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);
    const panelId = created.body.id as string;

    await request(app.getHttpServer())
      .delete(panelUrl(panelId))
      .set(auth(tokens["mall-admin"]))
      .expect(200);

    const updatedNode = await request(app.getHttpServer())
      .patch(routeNodeUrl(node.id))
      .set(auth(tokens["content-manager"]))
      .send({ type: RouteNodeType.ROUTE_POINT })
      .expect(200);

    expect(updatedNode.body.type).toBe(RouteNodeType.ROUTE_POINT);
    const storedPanel = await prisma.panel.findUniqueOrThrow({
      where: { id: panelId },
    });
    expect(storedPanel.isActive).toBe(false);
    expect(storedPanel.routeNodeId).toBe(node.id);
  });

  it("rejects an active Panel without complete Floor and RouteNode configuration", async () => {
    const response = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send({
        code: prefix + "-active-without-configuration",
        name: "Active without configuration",
      })
      .expect(400);

    expect(response.body.message).toBe(
      "Active panel requires floorId and routeNodeId",
    );
  });

  it("rejects activating an incomplete Panel through PATCH", async () => {
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send({
        code: prefix + "-incomplete-draft-panel",
        name: "Incomplete draft Panel",
        isActive: false,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(panelUrl(created.body.id as string))
      .set(auth(tokens["super-admin"]))
      .send({ isActive: true })
      .expect(400);

    expect(response.body.message).toBe(
      "Active panel requires floorId and routeNodeId",
    );
    const stored = await prisma.panel.findUniqueOrThrow({
      where: { id: created.body.id as string },
    });
    expect(stored.isActive).toBe(false);
    expect(stored.floorId).toBeNull();
    expect(stored.routeNodeId).toBeNull();
  });

  it("rejects runtime-only fields in POST and PATCH", async () => {
    await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send({
        code: prefix + "-runtime-fields-create",
        name: "Runtime fields create",
        isActive: false,
        status: PanelStatus.ONLINE,
        appVersion: "client-controlled",
        lastSeenAt: new Date().toISOString(),
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(panelUrl(baselinePanelId))
      .set(auth(tokens["mall-admin"]))
      .send({
        status: PanelStatus.OFFLINE,
        appVersion: "client-controlled",
        lastSeenAt: new Date().toISOString(),
      })
      .expect(400);
  });

  it.each(["code", "name", "isActive"])(
    "rejects explicit null for non-nullable %s",
    async (field) => {
      await request(app.getHttpServer())
        .patch(panelUrl(baselinePanelId))
        .set(auth(tokens["super-admin"]))
        .send({ [field]: null })
        .expect(400);
    },
  );

  it("lists Panels with deterministic sorting, filters and pagination", async () => {
    const list = await request(app.getHttpServer())
      .get(panelsUrl)
      .query({ search: "LIST-SCOPE", page: 1, limit: 10 })
      .set(auth(tokens["mall-admin"]))
      .expect(200);

    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([
      listInactiveId,
      listAlphaId,
      listBetaId,
    ]);
    expect(list.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
    });

    const byFloor = await request(app.getHttpServer())
      .get(panelsUrl)
      .query({ search: "list-scope", floorId: firstFloorId })
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    expect(byFloor.body.items.map((item: { id: string }) => item.id)).toEqual([
      listAlphaId,
      listBetaId,
    ]);

    const byStatus = await request(app.getHttpServer())
      .get(panelsUrl)
      .query({
        search: "list-scope",
        status: PanelStatus.MAINTENANCE,
      })
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    expect(byStatus.body.items).toHaveLength(1);
    expect(byStatus.body.items[0].id).toBe(listBetaId);

    const inactive = await request(app.getHttpServer())
      .get(panelsUrl)
      .query({ search: "list-scope", isActive: false })
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    expect(inactive.body.items).toHaveLength(1);
    expect(inactive.body.items[0].id).toBe(listInactiveId);

    const secondPage = await request(app.getHttpServer())
      .get(panelsUrl)
      .query({ search: "list-scope", page: 2, limit: 1 })
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    expect(secondPage.body.items[0].id).toBe(listAlphaId);
    expect(secondPage.body.pagination.totalPages).toBe(3);
  });

  it.each(["invalid", "yes", "1"])(
    "returns 400 for invalid isActive query value %s",
    async (isActive) => {
      await request(app.getHttpServer())
        .get(panelsUrl)
        .query({ isActive })
        .set(auth(tokens["mall-admin"]))
        .expect(400);
    },
  );

  it.each([
    ["page below minimum", { page: 0 }],
    ["limit below minimum", { limit: 0 }],
    ["limit above maximum", { limit: 101 }],
  ])("returns 400 for %s", async (_case, query) => {
    await request(app.getHttpServer())
      .get(panelsUrl)
      .query(query)
      .set(auth(tokens["mall-admin"]))
      .expect(400);
  });

  it("returns one Panel through an explicit safe admin projection", async () => {
    const response = await request(app.getHttpServer())
      .get(panelUrl(baselinePanelId))
      .set(auth(tokens["super-admin"]))
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        "id",
        "code",
        "name",
        "description",
        "status",
        "floorId",
        "routeNodeId",
        "location",
        "appVersion",
        "lastSeenAt",
        "isActive",
        "floor",
        "routeNode",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
    expect(Object.keys(response.body.floor).sort()).toEqual(
      ["id", "number", "name", "isActive"].sort(),
    );
    expect(Object.keys(response.body.routeNode).sort()).toEqual(
      [
        "id",
        "floorId",
        "type",
        "name",
        "code",
        "x",
        "y",
        "z",
        "isActive",
      ].sort(),
    );
    expect(response.body).not.toHaveProperty("adSlots");
    expect(response.body).not.toHaveProperty("analyticsEvents");
    expect(response.body.routeNode).not.toHaveProperty("metadata");
    expect(response.body.routeNode).not.toHaveProperty("outgoing");
  });

  it("patches configuration, normalizes name and preserves omitted fields", async () => {
    const node = await createRouteNode(firstFloorId, "patch-normalize-node");
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(panelUrl(created.body.id as string))
      .set(auth(tokens["mall-admin"]))
      .send({ name: "  Updated    Navigation\nPanel  " })
      .expect(200);

    expect(response.body.name).toBe("Updated Navigation Panel");
    expect(response.body.code).toBe(created.body.code);
    expect(response.body.floorId).toBe(firstFloorId);
    expect(response.body.routeNodeId).toBe(node.id);
    expect(response.body.location).toEqual(created.body.location);
  });

  it("rejects a PATCH whose merged state changes only floorId to another floor", async () => {
    const node = await createRouteNode(firstFloorId, "merged-state-node");
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);

    await request(app.getHttpServer())
      .patch(panelUrl(created.body.id as string))
      .set(auth(tokens["super-admin"]))
      .send({ floorId: secondFloorId })
      .expect(400);

    const unchanged = await prisma.panel.findUniqueOrThrow({
      where: { id: created.body.id as string },
    });
    expect(unchanged.floorId).toBe(firstFloorId);
    expect(unchanged.routeNodeId).toBe(node.id);
  });

  it("rejects a PATCH whose merged state changes only routeNodeId to another floor", async () => {
    const firstFloorNode = await createRouteNode(
      firstFloorId,
      "merged-route-node-first-floor",
    );
    const secondFloorNode = await createRouteNode(
      secondFloorId,
      "merged-route-node-second-floor",
    );
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send(buildPanel(firstFloorId, firstFloorNode.id))
      .expect(201);

    await request(app.getHttpServer())
      .patch(panelUrl(created.body.id as string))
      .set(auth(tokens["super-admin"]))
      .send({ routeNodeId: secondFloorNode.id })
      .expect(400);

    const unchanged = await prisma.panel.findUniqueOrThrow({
      where: { id: created.body.id as string },
    });
    expect(unchanged.floorId).toBe(firstFloorId);
    expect(unchanged.routeNodeId).toBe(firstFloorNode.id);
  });

  it("deactivates and clears nullable Panel relations in one PATCH", async () => {
    const node = await createRouteNode(firstFloorId, "nullable-patch-node");
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["mall-admin"]))
      .send(
        buildPanel(firstFloorId, node.id, {
          description: "Nullable description",
          location: { zone: "temporary" },
        }),
      )
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(panelUrl(created.body.id as string))
      .set(auth(tokens["mall-admin"]))
      .send({
        isActive: false,
        description: null,
        floorId: null,
        routeNodeId: null,
        location: null,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        code: created.body.code,
        name: created.body.name,
        description: null,
        floorId: null,
        routeNodeId: null,
        location: null,
        floor: null,
        routeNode: null,
        isActive: false,
      }),
    );
  });

  it("soft-disables idempotently without breaking AdSlot or AnalyticsEvent history", async () => {
    const node = await createRouteNode(firstFloorId, "history-panel-node");
    const created = await request(app.getHttpServer())
      .post(panelsUrl)
      .set(auth(tokens["super-admin"]))
      .send(buildPanel(firstFloorId, node.id))
      .expect(201);
    const panelId = created.body.id as string;
    const runtimeLastSeenAt = new Date("2026-08-10T08:30:00.000Z");
    await prisma.panel.update({
      where: { id: panelId },
      data: {
        status: PanelStatus.ONLINE,
        appVersion: "10.20.30-e2e",
        lastSeenAt: runtimeLastSeenAt,
      },
    });
    const beforeDelete = await prisma.panel.findUniqueOrThrow({
      where: { id: panelId },
    });
    const historySuffix = unique("history");

    const slot = await prisma.adSlot.create({
      data: {
        code: prefix + "-" + historySuffix,
        name: prefix + " history slot",
        placement: AdPlacement.HOME_PANEL_BANNER,
        panelId,
      },
    });
    const event = await prisma.analyticsEvent.create({
      data: {
        clientEventId: prefix + "-" + historySuffix,
        type: AnalyticsEventType.AD_IMPRESSION,
        source: AnalyticsSource.PANEL,
        panelId,
      },
    });

    const disabled = await request(app.getHttpServer())
      .delete(panelUrl(panelId))
      .set(auth(tokens["super-admin"]))
      .expect(200);
    expect(disabled.body.isActive).toBe(false);

    const repeated = await request(app.getHttpServer())
      .delete(panelUrl(panelId))
      .set(auth(tokens["super-admin"]))
      .expect(200);
    expect(repeated.body.id).toBe(panelId);
    expect(repeated.body.isActive).toBe(false);

    const storedPanel = await prisma.panel.findUnique({
      where: { id: panelId },
    });
    const storedSlot = await prisma.adSlot.findUnique({
      where: { id: slot.id },
    });
    const storedEvent = await prisma.analyticsEvent.findUnique({
      where: { id: event.id },
    });
    expect(storedPanel).not.toBeNull();
    expect(storedPanel?.isActive).toBe(false);
    expect(storedPanel).toEqual(
      expect.objectContaining({
        ...beforeDelete,
        isActive: false,
        updatedAt: expect.any(Date),
      }),
    );
    expect(storedPanel?.lastSeenAt).toEqual(runtimeLastSeenAt);
    expect(storedSlot?.panelId).toBe(panelId);
    expect(storedEvent?.panelId).toBe(panelId);
  });

  it("returns 404 for a missing Panel", async () => {
    const missingId = "missing-panel-" + runId;

    await request(app.getHttpServer())
      .get(panelUrl(missingId))
      .set(auth(tokens["mall-admin"]))
      .expect(404);
    await request(app.getHttpServer())
      .patch(panelUrl(missingId))
      .set(auth(tokens["mall-admin"]))
      .send({ isActive: false })
      .expect(404);
    await request(app.getHttpServer())
      .delete(panelUrl(missingId))
      .set(auth(tokens["mall-admin"]))
      .expect(404);
  });
});
