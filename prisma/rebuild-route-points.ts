import { PrismaClient, RouteEdgeType, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();
const IMPORT_BATCH = 'aligned-route-points-2026-11-06';

type Point = { code: string; x: number; y: number; component?: 'WEST' | 'EAST' };
type FloorPlan = { floorNumber: number; points: Point[]; links: [string, string][] };

function chain(codes: string[]): [string, string][] {
  return codes.slice(0, -1).map((code, index) => [code, codes[index + 1]]);
}

const floorPlans: FloorPlan[] = [
  {
    floorNumber: -1,
    points: [
      { code: 'B1_MAIN_01', x: 300, y: 315 },
      { code: 'B1_MAIN_02', x: 400, y: 315 },
      { code: 'B1_MAIN_03', x: 500, y: 315 },
    ],
    links: chain(['B1_MAIN_01', 'B1_MAIN_02', 'B1_MAIN_03']),
  },
  {
    floorNumber: 1,
    points: [
      ...[80, 170, 260, 350, 440, 530, 620, 710, 800].map((x, index) => ({ code: `F1_MAIN_${String(index + 1).padStart(2, '0')}`, x, y: 410 })),
      { code: 'F1_UP_01', x: 440, y: 320 },
      { code: 'F1_UP_02', x: 440, y: 230 },
      { code: 'F1_RIGHT_UP', x: 710, y: 350 },
      ...[170, 260, 350, 440, 530, 620, 710, 800].map((x, index) => ({ code: `F1_LOW_${String(index + 1).padStart(2, '0')}`, x, y: 500 })),
    ],
    links: [
      ...chain(['F1_MAIN_01', 'F1_MAIN_02', 'F1_MAIN_03', 'F1_MAIN_04', 'F1_MAIN_05', 'F1_MAIN_06', 'F1_MAIN_07', 'F1_MAIN_08', 'F1_MAIN_09']),
      ['F1_MAIN_05', 'F1_UP_01'], ['F1_UP_01', 'F1_UP_02'],
      ['F1_MAIN_08', 'F1_RIGHT_UP'],
      ...chain(['F1_LOW_01', 'F1_LOW_02', 'F1_LOW_03', 'F1_LOW_04', 'F1_LOW_05', 'F1_LOW_06', 'F1_LOW_07', 'F1_LOW_08']),
      ['F1_MAIN_02', 'F1_LOW_01'], ['F1_MAIN_05', 'F1_LOW_04'], ['F1_MAIN_08', 'F1_LOW_07'],
    ],
  },
  {
    floorNumber: 2,
    points: [
      ...[180, 270, 360, 450, 540].map((x, index) => ({ code: `F2_W_MAIN_${index + 1}`, x, y: 410, component: 'WEST' as const })),
      { code: 'F2_W_UP_1', x: 450, y: 340, component: 'WEST' },
      { code: 'F2_W_UP_2', x: 540, y: 340, component: 'WEST' },
      ...[180, 270, 360, 450, 540].map((x, index) => ({ code: `F2_W_LOW_${index + 1}`, x, y: 480, component: 'WEST' as const })),
      ...[620, 710, 800].map((x, index) => ({ code: `F2_E_TOP_${index + 1}`, x, y: 330, component: 'EAST' as const })),
      { code: 'F2_E_MID_L', x: 620, y: 415, component: 'EAST' },
      { code: 'F2_E_MID_R', x: 800, y: 415, component: 'EAST' },
      ...[620, 710, 800].map((x, index) => ({ code: `F2_E_LOW_${index + 1}`, x, y: 500, component: 'EAST' as const })),
    ],
    links: [
      ...chain(['F2_W_MAIN_1', 'F2_W_MAIN_2', 'F2_W_MAIN_3', 'F2_W_MAIN_4', 'F2_W_MAIN_5']),
      ['F2_W_MAIN_4', 'F2_W_UP_1'], ['F2_W_UP_1', 'F2_W_UP_2'],
      ...chain(['F2_W_LOW_1', 'F2_W_LOW_2', 'F2_W_LOW_3', 'F2_W_LOW_4', 'F2_W_LOW_5']),
      ['F2_W_MAIN_1', 'F2_W_LOW_1'], ['F2_W_MAIN_3', 'F2_W_LOW_3'], ['F2_W_MAIN_5', 'F2_W_LOW_5'],
      ...chain(['F2_E_TOP_1', 'F2_E_TOP_2', 'F2_E_TOP_3']),
      ['F2_E_TOP_1', 'F2_E_MID_L'], ['F2_E_MID_L', 'F2_E_LOW_1'],
      ['F2_E_TOP_3', 'F2_E_MID_R'], ['F2_E_MID_R', 'F2_E_LOW_3'],
      ...chain(['F2_E_LOW_1', 'F2_E_LOW_2', 'F2_E_LOW_3']),
    ],
  },
  {
    floorNumber: 3,
    points: [
      ...[110, 250, 390, 530, 670].map((x, index) => ({ code: `F3_TOP_${index + 1}`, x, y: 200 })),
      { code: 'F3_RIGHT_1', x: 670, y: 300 }, { code: 'F3_RIGHT_2', x: 670, y: 400 }, { code: 'F3_RIGHT_3', x: 670, y: 500 },
      ...[530, 390, 250, 110].map((x, index) => ({ code: `F3_BOTTOM_${index + 1}`, x, y: 500 })),
      { code: 'F3_LEFT_1', x: 110, y: 400 }, { code: 'F3_LEFT_2', x: 110, y: 300 },
    ],
    links: chain(['F3_TOP_1', 'F3_TOP_2', 'F3_TOP_3', 'F3_TOP_4', 'F3_TOP_5', 'F3_RIGHT_1', 'F3_RIGHT_2', 'F3_RIGHT_3', 'F3_BOTTOM_1', 'F3_BOTTOM_2', 'F3_BOTTOM_3', 'F3_BOTTOM_4', 'F3_LEFT_1', 'F3_LEFT_2', 'F3_TOP_1']),
  },
  {
    floorNumber: 4,
    points: [
      ...[180, 310, 440, 570, 700].map((x, index) => ({ code: `F4_TOP_${index + 1}`, x, y: 170 })),
      { code: 'F4_RIGHT_1', x: 700, y: 280 }, { code: 'F4_RIGHT_2', x: 700, y: 390 }, { code: 'F4_RIGHT_3', x: 700, y: 500 },
      ...[570, 440, 310, 180].map((x, index) => ({ code: `F4_BOTTOM_${index + 1}`, x, y: 500 })),
      { code: 'F4_LEFT_1', x: 180, y: 390 }, { code: 'F4_LEFT_2', x: 180, y: 280 },
    ],
    links: chain(['F4_TOP_1', 'F4_TOP_2', 'F4_TOP_3', 'F4_TOP_4', 'F4_TOP_5', 'F4_RIGHT_1', 'F4_RIGHT_2', 'F4_RIGHT_3', 'F4_BOTTOM_1', 'F4_BOTTOM_2', 'F4_BOTTOM_3', 'F4_BOTTOM_4', 'F4_LEFT_1', 'F4_LEFT_2', 'F4_TOP_1']),
  },
];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

function nodeComponent(node: { x: number; metadata: unknown }): 'WEST' | 'EAST' {
  if (node.metadata && typeof node.metadata === 'object' && 'block' in node.metadata) {
    const block = (node.metadata as { block?: unknown }).block;
    if (block === 'WEST' || block === 'EAST') return block;
  }
  return node.x < 600 ? 'WEST' : 'EAST';
}

async function main() {
  console.log(JSON.stringify({
    mode: process.env.APPLY_ROUTE_POINTS_REBUILD === 'YES' ? 'apply' : 'dry-run',
    floors: floorPlans.map((plan) => ({ floor: plan.floorNumber, points: plan.points.length, links: plan.links.length })),
  }, null, 2));
  if (process.env.APPLY_ROUTE_POINTS_REBUILD !== 'YES') return;

  await prisma.$transaction(async (tx) => {
    for (const plan of floorPlans) {
      const floor = await tx.floor.findUniqueOrThrow({ where: { number: plan.floorNumber } });
      const oldPoints = await tx.routeNode.findMany({ where: { floorId: floor.id, type: RouteNodeType.ROUTE_POINT } });
      const oldPointIds = oldPoints.map((point) => point.id);

      await tx.routeEdge.updateMany({
        where: { floorId: floor.id, type: RouteEdgeType.WALKWAY, isActive: true },
        data: { isActive: false },
      });
      await tx.routeEdge.deleteMany({
        where: { OR: [{ fromNodeId: { in: oldPointIds } }, { toNodeId: { in: oldPointIds } }] },
      });
      await tx.routeNode.deleteMany({ where: { id: { in: oldPointIds } } });

      const created = new Map<string, Awaited<ReturnType<typeof tx.routeNode.create>>>();
      for (const [index, point] of plan.points.entries()) {
        const node = await tx.routeNode.create({
          data: {
            floorId: floor.id,
            type: RouteNodeType.ROUTE_POINT,
            code: `${IMPORT_BATCH}:${point.code}`,
            name: `Точка маршрута ${point.code}`,
            x: point.x,
            y: point.y,
            z: 0,
            sortOrder: index,
            isActive: true,
            metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, component: point.component ?? null },
          },
        });
        created.set(point.code, node);
      }

      for (const [fromCode, toCode] of plan.links) {
        const from = created.get(fromCode)!;
        const to = created.get(toCode)!;
        const d = distance(from, to);
        await tx.routeEdge.create({
          data: { floorId: floor.id, fromNodeId: from.id, toNodeId: to.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH } },
        });
      }

      const destinations = await tx.routeNode.findMany({
        where: { floorId: floor.id, isActive: true, type: { not: RouteNodeType.ROUTE_POINT } },
      });
      for (const destination of destinations) {
        const component = plan.floorNumber === 2 ? nodeComponent(destination) : null;
        const candidates = plan.points.filter((point) => component === null || point.component === component);
        const nearestPoint = candidates.reduce((best, point) => distance(destination, point) < distance(destination, best) ? point : best);
        const nearestNode = created.get(nearestPoint.code)!;
        const d = distance(destination, nearestNode);
        await tx.routeEdge.create({
          data: { floorId: floor.id, fromNodeId: destination.id, toNodeId: nearestNode.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH } },
        });
      }
    }
  }, { timeout: 120_000 });

  for (const plan of floorPlans) {
    const floor = await prisma.floor.findUniqueOrThrow({ where: { number: plan.floorNumber } });
    const [points, anchors, edges] = await Promise.all([
      prisma.routeNode.count({ where: { floorId: floor.id, type: RouteNodeType.ROUTE_POINT, isActive: true } }),
      prisma.routeNode.count({ where: { floorId: floor.id, type: RouteNodeType.STORE_ANCHOR, isActive: true } }),
      prisma.routeEdge.count({ where: { floorId: floor.id, isActive: true } }),
    ]);
    console.log(JSON.stringify({ floor: plan.floorNumber, points, anchors, edges }));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
