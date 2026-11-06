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
          await tx.routeEdge.create({
            data: { floorId: floor.id, fromNodeId: from.id, toNodeId: to.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, corridor: `${fromCode}:${toCode}` } },
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
          await tx.routeEdge.create({
            data: { floorId: floor.id, fromNodeId: from.id, toNodeId: to.id, type: RouteEdgeType.WALKWAY, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: 'aligned-grid', importBatch: IMPORT_BATCH, connection: projection.elbow ? 'orthogonal-elbow' : 'perpendicular-projection' } },
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
