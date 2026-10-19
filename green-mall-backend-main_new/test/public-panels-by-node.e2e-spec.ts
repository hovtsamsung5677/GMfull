import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma, RouteNodeType } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Public panel by route node API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "public-panels-by-node-e2e-" + runId;
  const byNodeUrl = (nodeId: string) => "/api/public/panels/by-node/" + nodeId;
  let floorSequence = 0;

  async function createFloor() {
    floorSequence += 1;
    return prisma.floor.create({
      data: {
        number:
          -Math.floor((Date.now() + process.pid * 1000) % 1_500_000_000) -
          floorSequence,
        name: prefix + " floor",
        isActive: true,
      },
    });
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
        await prisma.panel.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.routeNode.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.floor.deleteMany({
          where: { name: { startsWith: prefix } },
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("returns the panel installed at the route node without JWT", async () => {
    const floor = await createFloor();
    const routeNode = await prisma.routeNode.create({
      data: {
        floorId: floor.id,
        type: RouteNodeType.PANEL,
        name: prefix + " panel node",
        code: prefix + "-node-" + floorSequence,
        x: 10,
        y: 20,
        z: 1,
        isActive: true,
      },
    });
    const panel = await prisma.panel.create({
      data: {
        code: prefix + "-panel-" + floorSequence,
        name: prefix + " Panel",
        floorId: floor.id,
        routeNodeId: routeNode.id,
        isActive: true,
      } satisfies Prisma.PanelUncheckedCreateInput,
    });

    const response = await request(app.getHttpServer())
      .get(byNodeUrl(routeNode.id))
      .expect(200);

    expect(response.body).toEqual({
      id: panel.id,
      code: panel.code,
      name: panel.name,
      floorId: floor.id,
    });
    expect(Object.keys(response.body).sort()).toEqual([
      "code",
      "floorId",
      "id",
      "name",
    ]);
  });

  it("returns 404 for a route node without a panel", async () => {
    const floor = await createFloor();
    const routeNode = await prisma.routeNode.create({
      data: {
        floorId: floor.id,
        type: RouteNodeType.ROUTE_POINT,
        name: prefix + " plain node",
        code: prefix + "-plain-node-" + floorSequence,
        x: 30,
        y: 40,
        z: 2,
        isActive: true,
      },
    });

    const response = await request(app.getHttpServer())
      .get(byNodeUrl(routeNode.id))
      .expect(404);

    expect(response.body.message).toBe("Panel not found for route node");
  });

  it("returns 404 for an unknown route node", async () => {
    await request(app.getHttpServer())
      .get(byNodeUrl(prefix + "-missing-node"))
      .expect(404);
  });
});
