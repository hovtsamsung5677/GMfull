import { MapObjectType, PrismaClient, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();
const IMPORT_BATCH = '2gis-floor4-2026-11-06';

const shops = [
  { name: 'Студия красоты', slug: 'studiya-krasoty-floor-4', category: 'beauty-and-health', x: 586, y: 151, anchorX: 586, anchorY: 170 },
  { name: 'Парикмахерская', slug: 'parikmaherskaya-floor-4', category: 'beauty-and-health', x: 633, y: 151, anchorX: 633, anchorY: 170 },
  { name: 'Антэк', slug: 'antek', category: 'services', x: 806, y: 283, anchorX: 700, anchorY: 280 },
  { name: 'ПСК Каркас', slug: 'psk-karkas', category: 'home-goods', x: 806, y: 339, anchorX: 700, anchorY: 340 },
  { name: 'Наша столица', slug: 'nasha-stolitsa', category: 'home-goods', x: 806, y: 393, anchorX: 700, anchorY: 400 },
  { name: 'Эверия Лайф', slug: 'everiya-life', category: 'services', x: 806, y: 463, anchorX: 700, anchorY: 450 },
  { name: 'СпецСтрой', slug: 'spetsstroy', category: 'home-goods', x: 485, y: 544, anchorX: 485, anchorY: 500 },
  { name: 'Фиеста', slug: 'fiesta-floor-4', category: 'services', x: 764, y: 544, anchorX: 700, anchorY: 500 },
];

const ring = [
  { code: 'F4_RING_NW', x: 180, y: 170 },
  { code: 'F4_RING_N', x: 450, y: 170 },
  { code: 'F4_RING_NE', x: 700, y: 170 },
  { code: 'F4_RING_E', x: 700, y: 330 },
  { code: 'F4_RING_SE', x: 700, y: 500 },
  { code: 'F4_RING_S', x: 450, y: 500 },
  { code: 'F4_RING_SW', x: 180, y: 500 },
  { code: 'F4_RING_W', x: 180, y: 330 },
];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

async function main() {
  const floor = await prisma.floor.findUniqueOrThrow({ where: { number: 4 } });
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const missing = [...new Set(shops.map((shop) => shop.category))].filter((slug) => !categoryBySlug.has(slug));
  if (missing.length) throw new Error(`Missing categories: ${missing.join(', ')}`);
  const currentStores = await prisma.store.count({ where: { floorId: floor.id } });
  console.log(JSON.stringify({ mode: process.env.APPLY_FLOOR4_REBUILD === 'YES' ? 'apply' : 'dry-run', currentStores, newStores: shops.length, vertical: 'Лифт 2' }, null, 2));
  console.table(shops.map(({ name, category, x, y }) => ({ name, category, x, y })));
  if (process.env.APPLY_FLOOR4_REBUILD !== 'YES') return;

  await prisma.$transaction(async (tx) => {
    const oldStores = await tx.store.findMany({ where: { floorId: floor.id } });
    const oldStoreIds = oldStores.map((store) => store.id);
    const oldObjects = await tx.mapObject.findMany({ where: { floorId: floor.id, OR: [{ type: MapObjectType.STORE }, { storeId: { in: oldStoreIds } }] } });
    const oldObjectIds = oldObjects.map((object) => object.id);
    const oldAnchors = await tx.routeNode.findMany({ where: { floorId: floor.id, OR: [{ type: RouteNodeType.STORE_ANCHOR }, { mapObjectId: { in: oldObjectIds } }] } });
    const oldAnchorIds = oldAnchors.map((node) => node.id);
    await tx.routeEdge.updateMany({ where: { OR: [{ fromNodeId: { in: oldAnchorIds } }, { toNodeId: { in: oldAnchorIds } }] }, data: { isActive: false } });
    await tx.routeNode.updateMany({ where: { id: { in: oldAnchorIds } }, data: { isActive: false } });
    await tx.mapObject.updateMany({ where: { id: { in: oldObjectIds } }, data: { isActive: false } });
    for (const [index, store] of oldStores.entries()) {
      await tx.store.update({ where: { id: store.id }, data: { slug: `archived-${IMPORT_BATCH}-${index}-${store.slug}`.slice(0, 180), floorId: null, tenantId: null, isActive: false, isVisible: false } });
    }
    const oldTenantIds = [...new Set(oldStores.map((store) => store.tenantId).filter(Boolean))] as string[];
    for (const tenantId of oldTenantIds) {
      if (await tx.store.count({ where: { tenantId, isActive: true } }) === 0) await tx.tenant.update({ where: { id: tenantId }, data: { isActive: false } });
    }

    const ringNodes = [];
    for (const point of ring) {
      const existing = await tx.routeNode.findFirst({ where: { floorId: floor.id, code: point.code } });
      const node = existing
        ? await tx.routeNode.update({ where: { id: existing.id }, data: { x: point.x, y: point.y, isActive: true } })
        : await tx.routeNode.create({ data: { floorId: floor.id, type: RouteNodeType.ROUTE_POINT, code: point.code, name: 'Точка кольцевого маршрута', x: point.x, y: point.y, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      ringNodes.push(node);
    }
    for (let index = 0; index < ringNodes.length; index++) {
      const from = ringNodes[index];
      const to = ringNodes[(index + 1) % ringNodes.length];
      const linked = await tx.routeEdge.findFirst({ where: { isActive: true, OR: [{ fromNodeId: from.id, toNodeId: to.id }, { fromNodeId: to.id, toNodeId: from.id }] } });
      if (!linked) {
        const d = distance(from, to);
        await tx.routeEdge.create({ data: { floorId: floor.id, fromNodeId: from.id, toNodeId: to.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, route: 'atrium-ring' } } });
      }
    }

    const existingElevator = await tx.routeNode.findFirst({ where: { floorId: floor.id, type: RouteNodeType.ELEVATOR, code: '2' } });
    const elevator = existingElevator
      ? await tx.routeNode.update({ where: { id: existingElevator.id }, data: { name: 'Лифт 2', x: 629, y: 302, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: '2' } } })
      : await tx.routeNode.create({ data: { floorId: floor.id, type: RouteNodeType.ELEVATOR, code: '2', name: 'Лифт 2', x: 629, y: 302, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: '2' } } });
    const nearestElevatorPoint = ringNodes.reduce((best, point) => distance(elevator, point) < distance(elevator, best) ? point : best);
    const elevatorLinked = await tx.routeEdge.findFirst({ where: { isActive: true, OR: [{ fromNodeId: elevator.id, toNodeId: nearestElevatorPoint.id }, { fromNodeId: nearestElevatorPoint.id, toNodeId: elevator.id }] } });
    if (!elevatorLinked) {
      const d = distance(elevator, nearestElevatorPoint);
      await tx.routeEdge.create({ data: { floorId: floor.id, fromNodeId: elevator.id, toNodeId: nearestElevatorPoint.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
    }

    for (const [index, shop] of shops.entries()) {
      const category = categoryBySlug.get(shop.category)!;
      let slug = shop.slug;
      if (await tx.store.findUnique({ where: { slug }, select: { id: true } })) slug = `${shop.slug}-alt`;
      if (await tx.store.findUnique({ where: { slug }, select: { id: true } })) throw new Error(`Cannot allocate slug for ${shop.name}`);
      const tenant = await tx.tenant.create({ data: { name: shop.name, isActive: true } });
      const store = await tx.store.create({ data: { name: shop.name, slug, tenantId: tenant.id, categoryId: category.id, floorId: floor.id, searchKeywords: `${shop.name} ${shop.category}`, isActive: true, isVisible: true } });
      const object = await tx.mapObject.create({ data: { type: MapObjectType.STORE, name: shop.name, floorId: floor.id, storeId: store.id, categoryId: category.id, x: shop.x, y: shop.y, z: 0, width: 24, height: 18, sortOrder: index, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      const anchor = await tx.routeNode.create({ data: { floorId: floor.id, type: RouteNodeType.STORE_ANCHOR, name: `Вход: ${shop.name}`, x: shop.anchorX, y: shop.anchorY, z: 0, mapObjectId: object.id, sortOrder: index, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
      const nearest = ringNodes.reduce((best, point) => distance(anchor, point) < distance(anchor, best) ? point : best);
      const d = distance(anchor, nearest);
      await tx.routeEdge.create({ data: { floorId: floor.id, fromNodeId: anchor.id, toNodeId: nearest.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
    }
  }, { timeout: 120_000 });

  const [storeCount, anchorCount] = await Promise.all([
    prisma.store.count({ where: { floorId: floor.id, isActive: true } }),
    prisma.routeNode.count({ where: { floorId: floor.id, type: RouteNodeType.STORE_ANCHOR, isActive: true } }),
  ]);
  console.log(JSON.stringify({ applied: true, storeCount, anchorCount }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
