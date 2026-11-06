import { PrismaClient, RouteEdgeType, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();
const IMPORT_BATCH = 'aligned-route-points-2026-11-06';

type Point = { code: string; x: number; y: number; component?: 'WEST' | 'EAST' };
type FloorPlan = { floorNumber: number; points: Point[]; links: [string, string][] };

type Projection = { x: number; y: number; distance: number; t: number; within: boolean };

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
      ...[25, 150, 255, 360, 460, 570, 680, 750].map((x, index) => ({ code: `F1_MAIN_${index + 1}`, x, y: 410 })),
      { code: 'F1_LEFT_TURN', x: 165, y: 450 },
      { code: 'F1_LEFT_LOW', x: 200, y: 495 },
      { code: 'F1_LEFT_EXIT', x: 200, y: 545 },
      { code: 'F1_CENTER_TOP', x: 460, y: 180 },
      { code: 'F1_CENTER_UPPER', x: 460, y: 300 },
      { code: 'F1_CENTER_LOW', x: 460, y: 545 },
      { code: 'F1_RIGHT_UP', x: 770, y: 380 },
      { code: 'F1_RIGHT_LOW', x: 750, y: 545 },
    ],
    links: [
      ...chain(['F1_MAIN_1', 'F1_MAIN_2', 'F1_MAIN_3', 'F1_MAIN_4', 'F1_MAIN_5', 'F1_MAIN_6', 'F1_MAIN_7', 'F1_MAIN_8']),
      ...chain(['F1_MAIN_2', 'F1_LEFT_TURN', 'F1_LEFT_LOW', 'F1_LEFT_EXIT']),
      ['F1_LEFT_LOW', 'F1_MAIN_3'],
      ...chain(['F1_CENTER_TOP', 'F1_CENTER_UPPER', 'F1_MAIN_5', 'F1_CENTER_LOW']),
      ['F1_MAIN_8', 'F1_RIGHT_UP'],
      ['F1_MAIN_8', 'F1_RIGHT_LOW'],
    ],
  },
  {
    floorNumber: 2,
    points: [
      { code: 'F2_W_START', x: 178, y: 518, component: 'WEST' },
      { code: 'F2_W_FORK', x: 230, y: 459, component: 'WEST' },
      { code: 'F2_W_MAIN_1', x: 308, y: 437, component: 'WEST' },
      { code: 'F2_W_MAIN_2', x: 381, y: 435, component: 'WEST' },
      { code: 'F2_W_CURVE_1', x: 400, y: 415, component: 'WEST' },
      { code: 'F2_W_CURVE_2', x: 405, y: 371, component: 'WEST' },
      { code: 'F2_W_TOP_1', x: 410, y: 341, component: 'WEST' },
      { code: 'F2_W_TOP_2', x: 478, y: 344, component: 'WEST' },
      { code: 'F2_W_BRANCH_1', x: 266, y: 496, component: 'WEST' },
      { code: 'F2_W_BRANCH_2', x: 267, y: 571, component: 'WEST' },
      { code: 'F2_E_TOP_L', x: 650, y: 405, component: 'EAST' },
      { code: 'F2_E_TOP_M', x: 735, y: 405, component: 'EAST' },
      { code: 'F2_E_TOP_R', x: 835, y: 405, component: 'EAST' },
      { code: 'F2_E_RIGHT_TOP', x: 835, y: 370, component: 'EAST' },
      { code: 'F2_E_RIGHT_LOW', x: 835, y: 540, component: 'EAST' },
      { code: 'F2_E_LOW_M', x: 735, y: 540, component: 'EAST' },
      { code: 'F2_E_LOW_L', x: 650, y: 540, component: 'EAST' },
    ],
    links: [
      ...chain(['F2_W_START', 'F2_W_FORK', 'F2_W_MAIN_1', 'F2_W_MAIN_2', 'F2_W_CURVE_1', 'F2_W_CURVE_2', 'F2_W_TOP_1', 'F2_W_TOP_2']),
      ...chain(['F2_W_FORK', 'F2_W_BRANCH_1', 'F2_W_BRANCH_2']),
      ...chain(['F2_E_RIGHT_TOP', 'F2_E_TOP_R', 'F2_E_TOP_M', 'F2_E_TOP_L', 'F2_E_LOW_L', 'F2_E_LOW_M', 'F2_E_RIGHT_LOW', 'F2_E_TOP_R']),
    ],
  },
  {
    floorNumber: 3,
    points: [
      { code: 'F3_LEFT_TOP', x: 180, y: 185 }, { code: 'F3_LEFT_MID', x: 180, y: 330 }, { code: 'F3_LEFT_LOW', x: 180, y: 480 },
      { code: 'F3_BOTTOM_1', x: 320, y: 480 }, { code: 'F3_BOTTOM_2', x: 500, y: 480 }, { code: 'F3_BOTTOM_3', x: 680, y: 480 },
      { code: 'F3_RIGHT_MID', x: 680, y: 330 }, { code: 'F3_RIGHT_TOP', x: 680, y: 175 },
    ],
    links: chain(['F3_LEFT_TOP', 'F3_LEFT_MID', 'F3_LEFT_LOW', 'F3_BOTTOM_1', 'F3_BOTTOM_2', 'F3_BOTTOM_3', 'F3_RIGHT_MID', 'F3_RIGHT_TOP']),
  },
  {
    floorNumber: 4,
    points: [
      { code: 'F4_LEFT_TOP', x: 180, y: 45 }, { code: 'F4_LEFT_MID', x: 190, y: 260 }, { code: 'F4_LEFT_LOW', x: 200, y: 450 },
      { code: 'F4_BOTTOM_1', x: 350, y: 450 }, { code: 'F4_BOTTOM_2', x: 520, y: 450 }, { code: 'F4_BOTTOM_3', x: 700, y: 450 },
      { code: 'F4_RIGHT_MID', x: 700, y: 260 }, { code: 'F4_RIGHT_TOP', x: 690, y: 100 }, { code: 'F4_TOP_SPUR', x: 610, y: 100 },
    ],
    links: [
      ...chain(['F4_LEFT_TOP', 'F4_LEFT_MID', 'F4_LEFT_LOW', 'F4_BOTTOM_1', 'F4_BOTTOM_2', 'F4_BOTTOM_3', 'F4_RIGHT_MID', 'F4_RIGHT_TOP']),
      ['F4_RIGHT_TOP', 'F4_TOP_SPUR'],
    ],
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

function projectToSegment(
  point: { x: number; y: number },
  start: Point,
  end: Point,
): Projection {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const rawT = lengthSquared === 0
    ? 0
    : ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const x = Math.round(start.x + dx * t);
  const y = Math.round(start.y + dy * t);
  return { x, y, t, within: rawT >= 0 && rawT <= 1, distance: Math.hypot(point.x - x, point.y - y) };
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

      const destinations = await tx.routeNode.findMany({
        where: { floorId: floor.id, isActive: true, type: { not: RouteNodeType.ROUTE_POINT } },
      });
      const pointByCode = new Map(plan.points.map((point) => [point.code, point]));
      const projections = destinations.map((destination) => {
        const component = plan.floorNumber === 2 ? nodeComponent(destination) : null;
        const candidates = plan.links
          .map(([fromCode, toCode], linkIndex) => {
            const from = pointByCode.get(fromCode)!;
            const to = pointByCode.get(toCode)!;
            return { fromCode, toCode, from, to, linkIndex, projection: projectToSegment(destination, from, to) };
          })
          .filter(({ from, to }) => component === null || (from.component === component && to.component === component));
        const perpendicularCandidates = candidates.filter((candidate) => candidate.projection.within);
        const best = (perpendicularCandidates.length ? perpendicularCandidates : candidates).reduce((current, candidate) =>
          candidate.projection.distance < current.projection.distance ? candidate : current,
        );
        const existingPoint = plan.points.find((point) =>
          point.x === best.projection.x && point.y === best.projection.y &&
          (component === null || point.component === component),
        );
        const segmentIsHorizontal = best.from.y === best.to.y;
        const elbow = best.projection.within ? null : {
          code: `ELBOW_${component ?? 'ALL'}_${segmentIsHorizontal ? destination.x : best.projection.x}_${segmentIsHorizontal ? best.projection.y : destination.y}`,
          x: segmentIsHorizontal ? destination.x : best.projection.x,
          y: segmentIsHorizontal ? best.projection.y : destination.y,
        };
        return {
          destination,
          code: existingPoint?.code ?? `PROJ_${component ?? 'ALL'}_${best.projection.x}_${best.projection.y}`,
          fromCode: best.fromCode,
          toCode: best.toCode,
          linkIndex: best.linkIndex,
          elbow,
          ...best.projection,
        };
      });

      const generatedPoints: Point[] = [...new Map(projections.flatMap((projection) => {
        const component = plan.floorNumber === 2 ? nodeComponent(projection.destination) : undefined;
        const points: Point[] = [{ code: projection.code, x: projection.x, y: projection.y, component }];
        if (projection.elbow) points.push({ ...projection.elbow, component });
        return points.map((point) => [point.code, point] as const);
      })).values()].filter((point) => !pointByCode.has(point.code));
      const allPoints = [...plan.points, ...generatedPoints];
      const created = new Map<string, Awaited<ReturnType<typeof tx.routeNode.create>>>();
      for (const [index, point] of allPoints.entries()) {
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

      for (const [linkIndex, [fromCode, toCode]] of plan.links.entries()) {
        const pointsOnSegment = [
          { code: fromCode, t: 0 },
          ...projections
            .filter((projection) => projection.linkIndex === linkIndex)
            .map((projection) => ({ code: projection.code, t: projection.t })),
          { code: toCode, t: 1 },
        ].sort((a, b) => a.t - b.t);
        const uniquePoints = pointsOnSegment.filter((point, index, items) =>
          index === 0 || created.get(point.code)!.x !== created.get(items[index - 1].code)!.x || created.get(point.code)!.y !== created.get(items[index - 1].code)!.y,
        );
        for (const [fromPointOnSegment, toPointOnSegment] of chain(uniquePoints.map((point) => point.code))) {
          const from = created.get(fromPointOnSegment)!;
          const to = created.get(toPointOnSegment)!;
          const d = distance(from, to);
          await tx.routeEdge.upsert({
            where: { fromNodeId_toNodeId: { fromNodeId: from.id, toNodeId: to.id } },
            update: { floorId: floor.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, corridor: `${fromCode}:${toCode}` } },
            create: { floorId: floor.id, fromNodeId: from.id, toNodeId: to.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, corridor: `${fromCode}:${toCode}` } },
          });
        }
      }

      for (const projection of projections) {
        const projectionNode = created.get(projection.code)!;
        const connectorNodes = projection.elbow
          ? [projection.destination, created.get(projection.elbow.code)!, projectionNode]
          : [projection.destination, projectionNode];
        for (let index = 0; index < connectorNodes.length - 1; index += 1) {
          const from = connectorNodes[index];
          const to = connectorNodes[index + 1];
          const d = distance(from, to);
          await tx.routeEdge.upsert({
            where: { fromNodeId_toNodeId: { fromNodeId: from.id, toNodeId: to.id } },
            update: { floorId: floor.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, connection: projection.elbow ? 'orthogonal-elbow' : 'perpendicular-projection' } },
            create: { floorId: floor.id, fromNodeId: from.id, toNodeId: to.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, connection: projection.elbow ? 'orthogonal-elbow' : 'perpendicular-projection' } },
          });
        }
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
