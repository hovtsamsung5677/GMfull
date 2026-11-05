import { MapObjectType, PrismaClient, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();
const IMPORT_BATCH = '2gis-floor3-2026-11-06';

const shops = [
  { name: 'Аркадный автомат', slug: 'arkadnyy-avtomat', category: 'entertainment', x: 243, y: 56, anchorX: 243, anchorY: 200 },
  { name: 'Super 8', slug: 'super-8', category: 'entertainment', x: 389, y: 68, anchorX: 389, anchorY: 200 },
  { name: 'Аэрохоккей', slug: 'aerohokkey', category: 'entertainment', x: 488, y: 56, anchorX: 488, anchorY: 200 },
  { name: 'Fun kids', slug: 'fun-kids', category: 'kids-goods', x: 754, y: 354, anchorX: 620, anchorY: 336 },
  { name: 'Студия английского языка', slug: 'studiya-angliyskogo-yazyka', category: 'services', x: 175, y: 547, anchorX: 175, anchorY: 500 },
  { name: 'Ак Барс-мед', slug: 'ak-bars-med', category: 'beauty-and-health', x: 390, y: 548, anchorX: 390, anchorY: 500 },
  { name: 'VR.Нереальное место', slug: 'vr-nerealnoe-mesto', category: 'entertainment', x: 708, y: 549, anchorX: 620, anchorY: 500 },
];

const ring = [
  { code: 'F3_RING_NW', x: 175, y: 200 },
  { code: 'F3_RING_N', x: 390, y: 200 },
  { code: 'F3_RING_NE', x: 620, y: 200 },
  { code: 'F3_RING_E', x: 620, y: 336 },
  { code: 'F3_RING_SE', x: 620, y: 500 },
  { code: 'F3_RING_S', x: 390, y: 500 },
  { code: 'F3_RING_SW', x: 175, y: 500 },
  { code: 'F3_RING_W', x: 110, y: 336 },
];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

async function main() {
  const [floor2, floor3] = await Promise.all([
    prisma.floor.findUniqueOrThrow({ where: { number: 2 } }),
    prisma.floor.findUniqueOrThrow({ where: { number: 3 } }),
  ]);
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const missing = [...new Set(shops.map((shop) => shop.category))].filter((slug) => !categoryBySlug.has(slug));
  if (missing.length) throw new Error(`Missing categories: ${missing.join(', ')}`);

  const currentStores = await prisma.store.count({ where: { floorId: floor3.id } });
  console.log(JSON.stringify({
    mode: process.env.APPLY_FLOOR3_REBUILD === 'YES' ? 'apply' : 'dry-run',
    currentStores,
    newStores: shops.length,
    verticals: ['Лифт 2', 'Эскалатор 4'],
  }, null, 2));
  console.table(shops.map(({ name, category, x, y }) => ({ name, category, x, y })));
  if (process.env.APPLY_FLOOR3_REBUILD !== 'YES') return;

  await prisma.$transaction(async (tx) => {
    const oldStores = await tx.store.findMany({ where: { floorId: floor3.id } });
    const oldStoreIds = oldStores.map((store) => store.id);
    const oldObjects = await tx.mapObject.findMany({
      where: { floorId: floor3.id, OR: [{ type: MapObjectType.STORE }, { storeId: { in: oldStoreIds } }] },
    });
    const oldObjectIds = oldObjects.map((object) => object.id);
    const oldAnchors = await tx.routeNode.findMany({
      where: { floorId: floor3.id, OR: [{ type: RouteNodeType.STORE_ANCHOR }, { mapObjectId: { in: oldObjectIds } }] },
    });
    const oldAnchorIds = oldAnchors.map((node) => node.id);
    await tx.routeEdge.updateMany({
      where: { OR: [{ fromNodeId: { in: oldAnchorIds } }, { toNodeId: { in: oldAnchorIds } }] },
      data: { isActive: false },
    });
    await tx.routeNode.updateMany({ where: { id: { in: oldAnchorIds } }, data: { isActive: false } });
    await tx.mapObject.updateMany({ where: { id: { in: oldObjectIds } }, data: { isActive: false } });
    for (const [index, store] of oldStores.entries()) {
      await tx.store.update({
        where: { id: store.id },
        data: { slug: `archived-${IMPORT_BATCH}-${index}-${store.slug}`.slice(0, 180), floorId: null, tenantId: null, isActive: false, isVisible: false },
      });
    }
    const tenantIds = [...new Set(oldStores.map((store) => store.tenantId).filter(Boolean))] as string[];
    for (const tenantId of tenantIds) {
      if (await tx.store.count({ where: { tenantId, isActive: true } }) === 0) {
        await tx.tenant.update({ where: { id: tenantId }, data: { isActive: false } });
      }
    }

    const ringNodes = [];
    for (const point of ring) {
      const existing = await tx.routeNode.findFirst({ where: { floorId: floor3.id, code: point.code } });
      const node = existing
        ? await tx.routeNode.update({ where: { id: existing.id }, data: { x: point.x, y: point.y, isActive: true } })
        : await tx.routeNode.create({ data: { floorId: floor3.id, type: RouteNodeType.ROUTE_POINT, code: point.code, name: 'Точка кольцевого маршрута', x: point.x, y: point.y, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      ringNodes.push(node);
    }
    for (let index = 0; index < ringNodes.length; index++) {
      const from = ringNodes[index];
      const to = ringNodes[(index + 1) % ringNodes.length];
      const existing = await tx.routeEdge.findFirst({ where: { isActive: true, OR: [{ fromNodeId: from.id, toNodeId: to.id }, { fromNodeId: to.id, toNodeId: from.id }] } });
      if (!existing) {
        const d = distance(from, to);
        await tx.routeEdge.create({ data: { floorId: floor3.id, fromNodeId: from.id, toNodeId: to.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, route: 'atrium-ring' } } });
      }
    }

    const oldElevator = await tx.routeNode.findFirst({ where: { floorId: floor3.id, type: RouteNodeType.ELEVATOR, isActive: true } });
    const elevator = oldElevator
      ? await tx.routeNode.update({ where: { id: oldElevator.id }, data: { code: '2', name: 'Лифт 2', x: 570, y: 325, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: '2' } } })
      : await tx.routeNode.create({ data: { floorId: floor3.id, type: RouteNodeType.ELEVATOR, code: '2', name: 'Лифт 2', x: 570, y: 325, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: '2' } } });

    const escalator2 = await tx.routeNode.findFirst({ where: { floorId: floor2.id, type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_4' } });
    const floor2Escalator = escalator2 ?? await tx.routeNode.create({ data: { floorId: floor2.id, type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_4', name: 'Эскалатор 4', x: 650, y: 500, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: '4' } } });
    const escalator3 = await tx.routeNode.findFirst({ where: { floorId: floor3.id, type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_4' } });
    const floor3Escalator = escalator3 ?? await tx.routeNode.create({ data: { floorId: floor3.id, type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_4', name: 'Эскалатор 4', x: 246, y: 436, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: '4' } } });

    const floor2Corridors = await tx.routeNode.findMany({ where: { floorId: floor2.id, type: RouteNodeType.ROUTE_POINT, isActive: true, x: { gte: 600 } } });
    if (!floor2Corridors.length) throw new Error('Right block corridor on floor 2 is missing');
    const nearestFloor2 = floor2Corridors.reduce((best, point) => distance(floor2Escalator, point) < distance(floor2Escalator, best) ? point : best);
    for (const [node, corridors, floorId] of [[elevator, ringNodes, floor3.id], [floor3Escalator, ringNodes, floor3.id], [floor2Escalator, floor2Corridors, floor2.id]] as const) {
      const nearest = node.id === floor2Escalator.id ? nearestFloor2 : corridors.reduce((best, point) => distance(node, point) < distance(node, best) ? point : best);
      const linked = await tx.routeEdge.findFirst({ where: { isActive: true, OR: [{ fromNodeId: node.id, toNodeId: nearest.id }, { fromNodeId: nearest.id, toNodeId: node.id }] } });
      if (!linked) {
        const d = distance(node, nearest);
        await tx.routeEdge.create({ data: { floorId, fromNodeId: node.id, toNodeId: nearest.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      }
    }

    for (const [index, shop] of shops.entries()) {
      const category = categoryBySlug.get(shop.category)!;
      let slug = shop.slug;
      if (await tx.store.findUnique({ where: { slug }, select: { id: true } })) slug = `${shop.slug}-floor-3`;
      if (await tx.store.findUnique({ where: { slug }, select: { id: true } })) throw new Error(`Cannot allocate slug for ${shop.name}`);
      const tenant = await tx.tenant.create({ data: { name: shop.name, isActive: true } });
      const store = await tx.store.create({ data: { name: shop.name, slug, tenantId: tenant.id, categoryId: category.id, floorId: floor3.id, searchKeywords: `${shop.name} ${shop.category}`, isActive: true, isVisible: true } });
      const object = await tx.mapObject.create({ data: { type: MapObjectType.STORE, name: shop.name, floorId: floor3.id, storeId: store.id, categoryId: category.id, x: shop.x, y: shop.y, z: 0, width: 24, height: 18, sortOrder: index, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      const anchor = await tx.routeNode.create({ data: { floorId: floor3.id, type: RouteNodeType.STORE_ANCHOR, name: `Вход: ${shop.name}`, x: shop.anchorX, y: shop.anchorY, z: 0, mapObjectId: object.id, sortOrder: index, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      const nearest = ringNodes.reduce((best, point) => distance(anchor, point) < distance(anchor, best) ? point : best);
      const d = distance(anchor, nearest);
      await tx.routeEdge.create({ data: { floorId: floor3.id, fromNodeId: anchor.id, toNodeId: nearest.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
    }
  }, { timeout: 120_000 });

  const [storeCount, anchorCount] = await Promise.all([
    prisma.store.count({ where: { floorId: floor3.id, isActive: true } }),
    prisma.routeNode.count({ where: { floorId: floor3.id, type: RouteNodeType.STORE_ANCHOR, isActive: true } }),
  ]);
  console.log(JSON.stringify({ applied: true, storeCount, anchorCount }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
