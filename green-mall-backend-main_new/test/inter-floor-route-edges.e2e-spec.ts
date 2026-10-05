import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  MapObjectType,
  Prisma,
  RouteEdgeType,
  RouteNodeType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Inter-floor route edges (e2e)", () => {
  type VerticalRouteEdgeType =
    | typeof RouteEdgeType.ELEVATOR
    | typeof RouteEdgeType.ESCALATOR
    | typeof RouteEdgeType.STAIRS;

  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "inter-floor-e2e-" + runId;
  const password = "InterFloorE2e12345!";
  const auth = (token: string) => ({ Authorization: "Bearer " + token });
  const edgeUrl = "/api/admin/route-edges";
  const edgeByIdUrl = (id: string) => edgeUrl + "/" + id;
  const nodeByIdUrl = (id: string) => "/api/admin/route-nodes/" + id;
  const buildUrl = "/api/public/routes/build";
  const toStoreUrl = "/api/public/routes/to-store";
  const floorGraphUrl = (floorId: string) =>
    "/api/public/floors/" + floorId + "/route-graph";
  const createdRoleIds: string[] = [];
  let sequence = 0;
  let token: string;
  let firstFloor: { id: string; number: number };
  let secondFloor: { id: string; number: number };
  let entranceNodeId: string;
  let firstElevatorNodeId: string;
  let secondElevatorNodeId: string;
  let firstElevatorCoordinates: { x: number; y: number; z: number | null };
  let secondElevatorCoordinates: { x: number; y: number; z: number | null };
  let targetNodeId: string;
  let baselineFirstWalkwayEdgeId: string;
  let baselineVerticalEdgeId: string;
  let storeId: string;

  const verticalNodeType: Record<VerticalRouteEdgeType, RouteNodeType> = {
    ELEVATOR: RouteNodeType.ELEVATOR,
    ESCALATOR: RouteNodeType.ESCALATOR,
    STAIRS: RouteNodeType.STAIRS,
  };

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
        description: "Temporary role created by inter-floor e2e tests",
      },
      select: { id: true },
    });
    createdRoleIds.push(role.id);
    return role.id;
  }

  async function createFloor(label: string, offset: number) {
    return prisma.floor.create({
      data: {
        number:
          Math.floor((Date.now() + process.pid * 1000) % 1_000_000_000) +
          offset,
        name: prefix + " " + label,
        isActive: true,
      },
      select: { id: true, number: true },
    });
  }

  async function createNode(
    floorId: string,
    label: string,
    type: RouteNodeType = RouteNodeType.ROUTE_POINT,
    isActive = true,
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
        isActive,
      },
    });
  }

  async function createVerticalNodes(
    type: VerticalRouteEdgeType,
    label: string,
  ) {
    const nodeType = verticalNodeType[type];
    const [fromNode, toNode] = await Promise.all([
      createNode(firstFloor.id, label + "-from", nodeType),
      createNode(secondFloor.id, label + "-to", nodeType),
    ]);
    return { fromNode, toNode };
  }

  function verticalEdgeBody(
    type: VerticalRouteEdgeType,
    fromNodeId: string,
    toNodeId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      type,
      floorId: null,
      fromNodeId,
      toNodeId,
      distance: 20,
      weight: 5,
      isBidirectional: true,
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

    const roleId = await ensureRole("CONTENT_MANAGER");
    const email = prefix + "@greenmall.local";
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name: "Inter-floor E2E user",
        roleId,
        isActive: true,
      },
    });
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);
    token = login.body.accessToken as string;

    firstFloor = await createFloor("First floor", 1);
    secondFloor = await createFloor("Second floor", 2);

    const tenant = await prisma.tenant.create({
      data: { name: prefix + " tenant", isActive: true },
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
        floorId: secondFloor.id,
        name: prefix + " destination store",
        slug: prefix + "-destination-store",
        isActive: true,
        isVisible: true,
      },
    });
    storeId = store.id;
    const mapObject = await prisma.mapObject.create({
      data: {
        type: MapObjectType.STORE,
        name: prefix + " destination map object",
        floorId: secondFloor.id,
        storeId,
        isActive: true,
      },
    });

    const [entrance, firstElevator, secondElevator, target] = await Promise.all(
      [
        createNode(firstFloor.id, "baseline-entrance", RouteNodeType.ENTRANCE),
        createNode(
          firstFloor.id,
          "baseline-elevator-first",
          RouteNodeType.ELEVATOR,
        ),
        createNode(
          secondFloor.id,
          "baseline-elevator-second",
          RouteNodeType.ELEVATOR,
        ),
        prisma.routeNode.create({
          data: {
            floorId: secondFloor.id,
            type: RouteNodeType.STORE_ANCHOR,
            name: prefix + " target store",
            code: prefix + "-target-store",
            x: 500,
            y: 600,
            z: 20,
            mapObjectId: mapObject.id,
            isActive: true,
          },
        }),
      ],
    );
    entranceNodeId = entrance.id;
    firstElevatorNodeId = firstElevator.id;
    secondElevatorNodeId = secondElevator.id;
    firstElevatorCoordinates = {
      x: firstElevator.x,
      y: firstElevator.y,
      z: firstElevator.z,
    };
    secondElevatorCoordinates = {
      x: secondElevator.x,
      y: secondElevator.y,
      z: secondElevator.z,
    };
    targetNodeId = target.id;

    const firstWalkway = await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.WALKWAY,
        floorId: firstFloor.id,
        fromNodeId: entranceNodeId,
        toNodeId: firstElevatorNodeId,
        distance: 10,
        weight: 3,
        isBidirectional: true,
      },
    });
    baselineFirstWalkwayEdgeId = firstWalkway.id;
    const vertical = await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.ELEVATOR,
        floorId: null,
        fromNodeId: firstElevatorNodeId,
        toNodeId: secondElevatorNodeId,
        distance: 20,
        weight: 5,
        isBidirectional: true,
      },
    });
    baselineVerticalEdgeId = vertical.id;
    await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.WALKWAY,
        floorId: secondFloor.id,
        fromNodeId: secondElevatorNodeId,
        toNodeId: targetNodeId,
        distance: 30,
        isBidirectional: true,
      },
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.routeEdge.deleteMany({
          where: {
            OR: [
              { fromNode: { code: { startsWith: prefix } } },
              { toNode: { code: { startsWith: prefix } } },
            ],
          },
        });
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.routeNode.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.mapObject.deleteMany({
          where: { name: { startsWith: prefix } },
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
          prisma.routeEdge.count({
            where: {
              OR: [
                { fromNode: { code: { startsWith: prefix } } },
                { toNode: { code: { startsWith: prefix } } },
              ],
            },
          }),
          prisma.routeNode.count({
            where: { code: { startsWith: prefix } },
          }),
          prisma.mapObject.count({
            where: { name: { startsWith: prefix } },
          }),
          prisma.store.count({
            where: { slug: { startsWith: prefix } },
          }),
          prisma.category.count({
            where: { slug: { startsWith: prefix } },
          }),
          prisma.tenant.count({
            where: { name: { startsWith: prefix } },
          }),
          prisma.floor.count({
            where: { name: { startsWith: prefix } },
          }),
          prisma.user.count({
            where: { email: { startsWith: prefix } },
          }),
          prisma.role.count({ where: { id: { in: createdRoleIds } } }),
        ]);
        expect(leftovers).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("keeps omitted RouteEdge type backward-compatible as WALKWAY", async () => {
    const [fromNode, toNode] = await Promise.all([
      createNode(firstFloor.id, "legacy-walkway-from"),
      createNode(firstFloor.id, "legacy-walkway-to"),
    ]);
    const edge = await prisma.routeEdge.create({
      data: {
        floorId: firstFloor.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
      },
    });

    expect(edge.type).toBe(RouteEdgeType.WALKWAY);
    expect(edge.floorId).toBe(firstFloor.id);
  });

  it.each([
    RouteEdgeType.ELEVATOR,
    RouteEdgeType.ESCALATOR,
    RouteEdgeType.STAIRS,
  ] as const)("creates a valid %s edge between floors", async (type) => {
    const { fromNode, toNode } = await createVerticalNodes(
      type,
      "valid-" + type.toLowerCase(),
    );
    const response = await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send(verticalEdgeBody(type, fromNode.id, toNode.id))
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        type,
        floorId: null,
        floor: null,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
      }),
    );
  });

  it("returns the complete vertical edge projection from admin list and get-by-id", async () => {
    const list = await request(app.getHttpServer())
      .get(edgeUrl)
      .set(auth(token))
      .query({
        type: RouteEdgeType.ELEVATOR,
        fromNodeId: firstElevatorNodeId,
        toNodeId: secondElevatorNodeId,
        page: 1,
        limit: 200,
      })
      .expect(200);
    const fromList = list.body.find(
      (edge: { id: string }) => edge.id === baselineVerticalEdgeId,
    );
    const expectedProjection = expect.objectContaining({
      id: baselineVerticalEdgeId,
      type: RouteEdgeType.ELEVATOR,
      floorId: null,
      floor: null,
      fromNodeId: firstElevatorNodeId,
      toNodeId: secondElevatorNodeId,
      fromNode: expect.objectContaining({ id: firstElevatorNodeId }),
      toNode: expect.objectContaining({ id: secondElevatorNodeId }),
      distance: 20,
      weight: 5,
      isBidirectional: true,
    });

    expect(fromList).toEqual(expectedProjection);

    const byId = await request(app.getHttpServer())
      .get(edgeByIdUrl(baselineVerticalEdgeId))
      .set(auth(token))
      .expect(200);
    expect(byId.body).toEqual(expectedProjection);
  });

  it("rejects WALKWAY between different floors", async () => {
    const [fromNode, toNode] = await Promise.all([
      createNode(firstFloor.id, "invalid-walkway-from"),
      createNode(secondFloor.id, "invalid-walkway-to"),
    ]);

    await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send({
        type: RouteEdgeType.WALKWAY,
        floorId: firstFloor.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
      })
      .expect(400);
  });

  it("rejects a vertical edge between nodes on one floor", async () => {
    const [fromNode, toNode] = await Promise.all([
      createNode(
        firstFloor.id,
        "same-floor-elevator-from",
        RouteNodeType.ELEVATOR,
      ),
      createNode(
        firstFloor.id,
        "same-floor-elevator-to",
        RouteNodeType.ELEVATOR,
      ),
    ]);

    await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send(verticalEdgeBody(RouteEdgeType.ELEVATOR, fromNode.id, toNode.id))
      .expect(400);
  });

  it.each([
    [RouteEdgeType.ELEVATOR, RouteNodeType.ESCALATOR],
    [RouteEdgeType.ESCALATOR, RouteNodeType.STAIRS],
    [RouteEdgeType.STAIRS, RouteNodeType.ELEVATOR],
  ] as const)(
    "rejects %s when endpoint node types do not match",
    async (edgeType, wrongNodeType) => {
      const [fromNode, toNode] = await Promise.all([
        createNode(firstFloor.id, "wrong-type-from", wrongNodeType),
        createNode(secondFloor.id, "wrong-type-to", wrongNodeType),
      ]);

      await request(app.getHttpServer())
        .post(edgeUrl)
        .set(auth(token))
        .send(verticalEdgeBody(edgeType, fromNode.id, toNode.id))
        .expect(400);
    },
  );

  it("rejects a vertical edge with non-null floorId", async () => {
    const { fromNode, toNode } = await createVerticalNodes(
      RouteEdgeType.ELEVATOR,
      "vertical-with-floor",
    );

    await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send(
        verticalEdgeBody(RouteEdgeType.ELEVATOR, fromNode.id, toNode.id, {
          floorId: firstFloor.id,
        }),
      )
      .expect(400);
  });

  it("rejects WALKWAY without floorId", async () => {
    const [fromNode, toNode] = await Promise.all([
      createNode(firstFloor.id, "walkway-no-floor-from"),
      createNode(firstFloor.id, "walkway-no-floor-to"),
    ]);

    await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send({
        type: RouteEdgeType.WALKWAY,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
      })
      .expect(400);
  });

  it("rejects a self-edge without creating a RouteEdge row", async () => {
    const node = await createNode(firstFloor.id, "self-edge-node");

    await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send({
        type: RouteEdgeType.WALKWAY,
        floorId: firstFloor.id,
        fromNodeId: node.id,
        toNodeId: node.id,
      })
      .expect(400);

    await expect(
      prisma.routeEdge.count({
        where: { fromNodeId: node.id, toNodeId: node.id },
      }),
    ).resolves.toBe(0);
  });

  it.each([
    ["distance", 0],
    ["weight", -1],
  ])("rejects non-positive %s", async (field, value) => {
    const [fromNode, toNode] = await Promise.all([
      createNode(firstFloor.id, "invalid-cost-from"),
      createNode(firstFloor.id, "invalid-cost-to"),
    ]);

    await request(app.getHttpServer())
      .post(edgeUrl)
      .set(auth(token))
      .send({
        floorId: firstFloor.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        [field]: value,
      })
      .expect(400);
  });

  it("validates RouteEdge PATCH against its complete merged state", async () => {
    const [fromNode, toNode] = await Promise.all([
      createNode(firstFloor.id, "merged-edge-from"),
      createNode(firstFloor.id, "merged-edge-to"),
    ]);
    const edge = await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.WALKWAY,
        floorId: firstFloor.id,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
      },
    });

    await request(app.getHttpServer())
      .patch(edgeByIdUrl(edge.id))
      .set(auth(token))
      .send({ type: RouteEdgeType.ELEVATOR })
      .expect(400);

    const stored = await prisma.routeEdge.findUniqueOrThrow({
      where: { id: edge.id },
    });
    expect(stored.type).toBe(RouteEdgeType.WALKWAY);
    expect(stored.floorId).toBe(firstFloor.id);
  });

  it.each(["type", "floorId"])(
    "returns 409 when RouteNode PATCH of %s would invalidate an edge",
    async (field) => {
      const value =
        field === "type" ? RouteNodeType.ROUTE_POINT : secondFloor.id;
      const response = await request(app.getHttpServer())
        .patch(nodeByIdUrl(firstElevatorNodeId))
        .set(auth(token))
        .send({ [field]: value })
        .expect(409);

      expect(response.body.message).toContain(
        "Route node update would make route edge",
      );
      const stored = await prisma.routeNode.findUniqueOrThrow({
        where: { id: firstElevatorNodeId },
      });
      expect(stored.type).toBe(RouteNodeType.ELEVATOR);
      expect(stored.floorId).toBe(firstFloor.id);
    },
  );

  it("allows a RouteNode PATCH that preserves every incident edge", async () => {
    const name = prefix + " renamed elevator";
    const response = await request(app.getHttpServer())
      .patch(nodeByIdUrl(firstElevatorNodeId))
      .set(auth(token))
      .send({ name })
      .expect(200);

    expect(response.body.name).toBe(name);
  });

  it("serializes concurrent edge creation and incompatible RouteNode PATCH", async () => {
    const { fromNode, toNode } = await createVerticalNodes(
      RouteEdgeType.ELEVATOR,
      "concurrent-elevator",
    );

    const [createResponse, updateResponse] = await Promise.all([
      request(app.getHttpServer())
        .post(edgeUrl)
        .set(auth(token))
        .send(verticalEdgeBody(RouteEdgeType.ELEVATOR, fromNode.id, toNode.id)),
      request(app.getHttpServer())
        .patch(nodeByIdUrl(fromNode.id))
        .set(auth(token))
        .send({ type: RouteNodeType.ROUTE_POINT }),
    ]);

    expect([200, 201]).toContain(
      createResponse.status === 201
        ? createResponse.status
        : updateResponse.status,
    );
    expect(createResponse.status === 201 && updateResponse.status === 200).toBe(
      false,
    );
    expect([201, 400]).toContain(createResponse.status);
    expect([200, 409]).toContain(updateResponse.status);

    const [storedNode, storedEdges] = await Promise.all([
      prisma.routeNode.findUniqueOrThrow({ where: { id: fromNode.id } }),
      prisma.routeEdge.findMany({
        where: { fromNodeId: fromNode.id, toNodeId: toNode.id },
      }),
    ]);

    if (storedEdges.length === 1) {
      expect(storedNode.type).toBe(RouteNodeType.ELEVATOR);
      expect(storedEdges[0].type).toBe(RouteEdgeType.ELEVATOR);
      expect(storedEdges[0].floorId).toBeNull();
    } else {
      expect(storedEdges).toHaveLength(0);
      expect(storedNode.type).toBe(RouteNodeType.ROUTE_POINT);
    }
  });

  it("emits a vertical MOVE before ARRIVE for a direct connector traversal", async () => {
    const response = await request(app.getHttpServer())
      .get(buildUrl)
      .query({
        fromNodeId: firstElevatorNodeId,
        toNodeId: secondElevatorNodeId,
      })
      .expect(200);

    expect(
      response.body.instructions.map(
        (instruction: { type: string }) => instruction.type,
      ),
    ).toEqual(["START", "MOVE", "ARRIVE"]);
    expect(response.body.instructions[1]).toEqual(
      expect.objectContaining({
        order: 2,
        type: "MOVE",
        nodeId: secondElevatorNodeId,
      }),
    );
    expect(response.body.instructions[1].title).toContain("Поднимитесь");
    expect(response.body.instructions[1].title).toContain("лифте");
    expect(response.body.instructions[1].title).toContain(
      String(secondFloor.number),
    );
    expect(response.body.instructions[2]).toEqual(
      expect.objectContaining({
        order: 3,
        type: "ARRIVE",
        nodeId: secondElevatorNodeId,
      }),
    );
  });

  it("emits a reverse vertical MOVE with the opposite target floor before ARRIVE", async () => {
    const response = await request(app.getHttpServer())
      .get(buildUrl)
      .query({
        fromNodeId: secondElevatorNodeId,
        toNodeId: firstElevatorNodeId,
      })
      .expect(200);

    expect(
      response.body.instructions.map(
        (instruction: { type: string }) => instruction.type,
      ),
    ).toEqual(["START", "MOVE", "ARRIVE"]);
    expect(response.body.instructions[1]).toEqual(
      expect.objectContaining({
        order: 2,
        type: "MOVE",
        nodeId: firstElevatorNodeId,
      }),
    );
    expect(response.body.instructions[1].title).toContain("Спуститесь");
    expect(response.body.instructions[1].title).toContain("лифте");
    expect(response.body.instructions[1].title).toContain(
      String(firstFloor.number),
    );
    expect(response.body.instructions[2]).toEqual(
      expect.objectContaining({
        order: 3,
        type: "ARRIVE",
        nodeId: firstElevatorNodeId,
      }),
    );
  });

  it.each([
    [RouteEdgeType.ESCALATOR, "эскалаторе"],
    [RouteEdgeType.STAIRS, "лестнице"],
  ] as const)(
    "builds a direct %s route with a typed target-floor instruction",
    async (type, expectedText) => {
      const { fromNode, toNode } = await createVerticalNodes(
        type,
        "instruction-" + type.toLowerCase(),
      );
      await prisma.routeEdge.create({
        data: {
          type,
          floorId: null,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          isBidirectional: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(buildUrl)
        .query({ fromNodeId: fromNode.id, toNodeId: toNode.id })
        .expect(200);
      const moveInstruction = response.body.instructions.find(
        (instruction: { type: string }) => instruction.type === "MOVE",
      );

      expect(response.body.routeSegments[0].type).toBe(type);
      expect(moveInstruction).toEqual(
        expect.objectContaining({ type: "MOVE", nodeId: toNode.id }),
      );
      expect(moveInstruction.title.toLowerCase()).toContain(expectedText);
      expect(moveInstruction.title).toContain(String(secondFloor.number));
    },
  );

  it("builds an ordered inter-floor route with v3 segments and instruction", async () => {
    const response = await request(app.getHttpServer())
      .get(buildUrl)
      .query({ fromNodeId: entranceNodeId, toNodeId: targetNodeId })
      .expect(200);

    expect(response.body.nodes.map((node: { id: string }) => node.id)).toEqual([
      entranceNodeId,
      firstElevatorNodeId,
      secondElevatorNodeId,
      targetNodeId,
    ]);
    expect(
      response.body.edges.map((edge: { type: RouteEdgeType }) => edge.type),
    ).toEqual([
      RouteEdgeType.WALKWAY,
      RouteEdgeType.ELEVATOR,
      RouteEdgeType.WALKWAY,
    ]);
    expect(response.body.totalDistance).toBe(60);
    expect(response.body.totalWeight).toBe(38);
    expect(response.body.meta.schemaVersion).toBe("green-mall-route-v3");

    const connector = response.body.routeSegments.find(
      (segment: { type: RouteEdgeType }) =>
        segment.type === RouteEdgeType.ELEVATOR,
    );
    expect(connector).toEqual(
      expect.objectContaining({
        edgeId: baselineVerticalEdgeId,
        type: RouteEdgeType.ELEVATOR,
        floorId: null,
        fromFloorId: firstFloor.id,
        toFloorId: secondFloor.id,
      }),
    );
    expect(
      response.body.instructions.some(
        (instruction: { type: string; title: string }) =>
          instruction.type === "MOVE" &&
          instruction.title.includes("лифте") &&
          instruction.title.includes(String(secondFloor.number)),
      ),
    ).toBe(true);
  });

  it("builds an inter-floor route to a store without floorId", async () => {
    const response = await request(app.getHttpServer())
      .get(toStoreUrl)
      .query({ fromNodeId: entranceNodeId, storeId })
      .expect(200);

    expect(response.body.targetStore.id).toBe(storeId);
    expect(response.body.toNode.id).toBe(targetNodeId);
    expect(response.body.meta.schemaVersion).toBe(
      "green-mall-route-to-store-v3",
    );
    expect(
      response.body.routeSegments.some(
        (segment: { type: RouteEdgeType }) =>
          segment.type === RouteEdgeType.ELEVATOR,
      ),
    ).toBe(true);
  });

  it("traverses a bidirectional vertical edge in reverse", async () => {
    const response = await request(app.getHttpServer())
      .get(buildUrl)
      .query({ fromNodeId: targetNodeId, toNodeId: entranceNodeId })
      .expect(200);

    const connector = response.body.routeSegments.find(
      (segment: { type: RouteEdgeType }) =>
        segment.type === RouteEdgeType.ELEVATOR,
    );
    expect(connector).toEqual(
      expect.objectContaining({
        edgeId: baselineVerticalEdgeId,
        type: RouteEdgeType.ELEVATOR,
        fromNodeId: secondElevatorNodeId,
        toNodeId: firstElevatorNodeId,
        from: {
          x: secondElevatorCoordinates.x,
          y: secondElevatorCoordinates.y,
          z: secondElevatorCoordinates.z ?? 0,
        },
        to: {
          x: firstElevatorCoordinates.x,
          y: firstElevatorCoordinates.y,
          z: firstElevatorCoordinates.z ?? 0,
        },
        fromFloorId: secondFloor.id,
        toFloorId: firstFloor.id,
      }),
    );
    const verticalInstruction = response.body.instructions.find(
      (instruction: { type: string; title: string }) =>
        instruction.type === "MOVE" && instruction.title.includes("лифте"),
    );
    expect(verticalInstruction).toEqual(
      expect.objectContaining({
        type: "MOVE",
        nodeId: firstElevatorNodeId,
      }),
    );
    expect(verticalInstruction.title).toContain("Спуститесь");
    expect(verticalInstruction.title).toContain(String(firstFloor.number));
  });

  it("traverses a one-way vertical edge only from fromNode to toNode", async () => {
    const { fromNode, toNode } = await createVerticalNodes(
      RouteEdgeType.STAIRS,
      "one-way-stairs",
    );
    await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.STAIRS,
        floorId: null,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        distance: 11,
        weight: 4,
        isBidirectional: false,
      },
    });

    const forward = await request(app.getHttpServer())
      .get(buildUrl)
      .query({ fromNodeId: fromNode.id, toNodeId: toNode.id })
      .expect(200);
    expect(forward.body.totalDistance).toBe(11);
    expect(forward.body.totalWeight).toBe(4);

    await request(app.getHttpServer())
      .get(buildUrl)
      .query({ fromNodeId: toNode.id, toNodeId: fromNode.id })
      .expect(404);
  });

  it("includes a connector in both floor graphs while nodes stay floor-local", async () => {
    const [firstGraph, secondGraph] = await Promise.all([
      request(app.getHttpServer())
        .get(floorGraphUrl(firstFloor.id))
        .expect(200),
      request(app.getHttpServer())
        .get(floorGraphUrl(secondFloor.id))
        .expect(200),
    ]);

    expect(
      firstGraph.body.edges.some(
        (edge: { id: string }) => edge.id === baselineVerticalEdgeId,
      ),
    ).toBe(true);
    expect(
      secondGraph.body.edges.some(
        (edge: { id: string }) => edge.id === baselineVerticalEdgeId,
      ),
    ).toBe(true);
    expect(
      firstGraph.body.nodes.every(
        (node: { floorId: string }) => node.floorId === firstFloor.id,
      ),
    ).toBe(true);
    expect(
      secondGraph.body.nodes.every(
        (node: { floorId: string }) => node.floorId === secondFloor.id,
      ),
    ).toBe(true);
    expect(
      firstGraph.body.nodes.some(
        (node: { id: string }) => node.id === secondElevatorNodeId,
      ),
    ).toBe(false);
  });

  it("excludes a vertical edge unrelated to the selected floor graph", async () => {
    const [thirdFloor, fourthFloor] = await Promise.all([
      createFloor("Unrelated third floor", 101),
      createFloor("Unrelated fourth floor", 102),
    ]);
    const [fromNode, toNode] = await Promise.all([
      createNode(
        thirdFloor.id,
        "unrelated-elevator-from",
        RouteNodeType.ELEVATOR,
      ),
      createNode(
        fourthFloor.id,
        "unrelated-elevator-to",
        RouteNodeType.ELEVATOR,
      ),
    ]);
    const unrelatedEdge = await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.ELEVATOR,
        floorId: null,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        isActive: true,
      },
    });

    const graph = await request(app.getHttpServer())
      .get(floorGraphUrl(firstFloor.id))
      .expect(200);
    expect(
      graph.body.edges.some(
        (edge: { id: string }) => edge.id === unrelatedEdge.id,
      ),
    ).toBe(false);
  });

  it("keeps the public map scene floor-local", async () => {
    const scene = await request(app.getHttpServer())
      .get("/api/public/map/scene")
      .query({ floorId: firstFloor.id })
      .expect(200);

    expect(scene.body.floor.id).toBe(firstFloor.id);
    expect(
      scene.body.routeEdges.some(
        (edge: { id: string }) => edge.id === baselineFirstWalkwayEdgeId,
      ),
    ).toBe(true);
    expect(
      scene.body.routeEdges.some(
        (edge: { id: string }) => edge.id === baselineVerticalEdgeId,
      ),
    ).toBe(false);
    expect(
      scene.body.routeNodes.every(
        (node: { floorId: string }) => node.floorId === firstFloor.id,
      ),
    ).toBe(true);
    expect(
      scene.body.routeNodes.some(
        (node: { id: string }) => node.id === secondElevatorNodeId,
      ),
    ).toBe(false);
  });

  it("keeps floorId route building restricted to one floor", async () => {
    const sameFloor = await request(app.getHttpServer())
      .get(buildUrl)
      .query({
        fromNodeId: entranceNodeId,
        toNodeId: firstElevatorNodeId,
        floorId: firstFloor.id,
      })
      .expect(200);
    expect(sameFloor.body.routeSegments).toHaveLength(1);
    expect(sameFloor.body.routeSegments[0]).toEqual(
      expect.objectContaining({
        type: RouteEdgeType.WALKWAY,
        floorId: firstFloor.id,
        fromFloorId: firstFloor.id,
        toFloorId: firstFloor.id,
      }),
    );

    await request(app.getHttpServer())
      .get(buildUrl)
      .query({
        fromNodeId: entranceNodeId,
        toNodeId: targetNodeId,
        floorId: firstFloor.id,
      })
      .expect(404);
  });

  it("does not use an inactive vertical edge", async () => {
    const { fromNode, toNode } = await createVerticalNodes(
      RouteEdgeType.ESCALATOR,
      "inactive-edge",
    );
    const edge = await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.ESCALATOR,
        floorId: null,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        isActive: false,
      },
    });

    await request(app.getHttpServer())
      .get(buildUrl)
      .query({ fromNodeId: fromNode.id, toNodeId: toNode.id })
      .expect(404);
    const graph = await request(app.getHttpServer())
      .get(floorGraphUrl(firstFloor.id))
      .expect(200);
    expect(
      graph.body.edges.some((item: { id: string }) => item.id === edge.id),
    ).toBe(false);
  });

  it("does not expose or use an edge with an inactive endpoint", async () => {
    const { fromNode, toNode } = await createVerticalNodes(
      RouteEdgeType.ELEVATOR,
      "inactive-endpoint",
    );
    const edge = await prisma.routeEdge.create({
      data: {
        type: RouteEdgeType.ELEVATOR,
        floorId: null,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        isActive: true,
      },
    });
    await prisma.routeNode.update({
      where: { id: toNode.id },
      data: { isActive: false },
    });

    await request(app.getHttpServer())
      .get(buildUrl)
      .query({ fromNodeId: fromNode.id, toNodeId: toNode.id })
      .expect(404);
    const graph = await request(app.getHttpServer())
      .get(floorGraphUrl(firstFloor.id))
      .expect(200);
    expect(
      graph.body.edges.some((item: { id: string }) => item.id === edge.id),
    ).toBe(false);
  });

  it("filters public edges by vertical type", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/public/route-edges")
      .query({ type: RouteEdgeType.ELEVATOR, page: 1, limit: 200 })
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(
      response.body.every(
        (edge: { type: RouteEdgeType }) => edge.type === RouteEdgeType.ELEVATOR,
      ),
    ).toBe(true);
  });
});
