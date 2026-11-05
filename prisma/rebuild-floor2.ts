import { MapObjectType, PrismaClient, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();
const FLOOR_NUMBER = 2;
const IMPORT_BATCH = '2gis-floor2-2026-11-06';

type Block = 'WEST' | 'EAST';
type Shop = {
  name: string;
  slug: string;
  category: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  block: Block;
};

const shops: Shop[] = [
  { name: 'Спортмастер', slug: 'sportmaster', category: 'sport', x: 112, y: 292, anchorX: 210, anchorY: 405, block: 'WEST' },
  { name: 'Zolla', slug: 'zolla', category: 'clothing', x: 260, y: 205, anchorX: 330, anchorY: 405, block: 'WEST' },
  { name: 'Читай-город', slug: 'chitay-gorod', category: 'home-goods', x: 338, y: 292, anchorX: 409, anchorY: 405, block: 'WEST' },
  { name: 'Askona', slug: 'askona', category: 'home-goods', x: 457, y: 290, anchorX: 409, anchorY: 405, block: 'WEST' },
  { name: 'Cleopatra', slug: 'cleopatra', category: 'beauty-and-health', x: 238, y: 535, anchorX: 247, anchorY: 409, block: 'WEST' },
  { name: 'Kseniya Rikalina', slug: 'kseniya-rikalina', category: 'clothing', x: 290, y: 525, anchorX: 247, anchorY: 409, block: 'WEST' },
  { name: 'Kari Kids', slug: 'kari-kids', category: 'kids-goods', x: 470, y: 40, anchorX: 430, anchorY: 340, block: 'WEST' },
  { name: 'Kari Гипер', slug: 'kari-giper', category: 'shoes', x: 650, y: 40, anchorX: 500, anchorY: 340, block: 'WEST' },
  { name: 'Мясной', slug: 'myasnoy', category: 'groceries', x: 505, y: 455, anchorX: 409, anchorY: 408, block: 'WEST' },
  { name: 'Ателье', slug: 'atele', category: 'services', x: 578, y: 274, anchorX: 714, anchorY: 400, block: 'EAST' },
  { name: 'Колибри', slug: 'kolibri', category: 'clothing', x: 578, y: 349, anchorX: 714, anchorY: 410, block: 'EAST' },
  { name: 'Мажор', slug: 'mazhor', category: 'clothing', x: 657, y: 274, anchorX: 714, anchorY: 400, block: 'EAST' },
  { name: 'МажорКа', slug: 'mazhorka', category: 'shoes', x: 740, y: 274, anchorX: 760, anchorY: 400, block: 'EAST' },
  { name: 'Метрология', slug: 'metrologiya', category: 'services', x: 818, y: 323, anchorX: 817, anchorY: 400, block: 'EAST' },
  { name: 'Мажор Kids', slug: 'mazhor-kids', category: 'kids-goods', x: 818, y: 399, anchorX: 817, anchorY: 430, block: 'EAST' },
  { name: 'BomBitta Room', slug: 'bombitta-room', category: 'clothing', x: 817, y: 490, anchorX: 817, anchorY: 450, block: 'EAST' },
  { name: 'Artphoto', slug: 'artphoto', category: 'services', x: 617, y: 470, anchorX: 714, anchorY: 452, block: 'EAST' },
  { name: 'Феличита', slug: 'felichita', category: 'shoes', x: 578, y: 526, anchorX: 714, anchorY: 452, block: 'EAST' },
  { name: 'Shopaholic', slug: 'shopaholic', category: 'shoes', x: 652, y: 575, anchorX: 714, anchorY: 452, block: 'EAST' },
  { name: 'Svoboda', slug: 'svoboda', category: 'clothing', x: 811, y: 575, anchorX: 817, anchorY: 450, block: 'EAST' },
];

const verticals = [
  { type: RouteNodeType.ELEVATOR, code: '1', name: 'Лифт 1', floor1: { x: 445, y: 324 }, floor2: { x: 457, y: 341 }, block: 'WEST' as Block },
  { type: RouteNodeType.ELEVATOR, code: '2', name: 'Лифт 2', floor1: { x: 771, y: 415 }, floor2: { x: 759, y: 436 }, block: 'EAST' as Block },
  { type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_1', name: 'Эскалатор 1', floor1: { x: 500, y: 405 }, floor2: { x: 588, y: 323 }, block: 'WEST' as Block },
  { type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_2', name: 'Эскалатор 2', floor1: { x: 690, y: 445 }, floor2: { x: 650, y: 380 }, block: 'EAST' as Block },
  { type: RouteNodeType.ESCALATOR, code: 'ESCALATOR_3', name: 'Эскалатор 3', floor1: { x: 760, y: 445 }, floor2: { x: 800, y: 380 }, block: 'EAST' as Block },
];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

async function main() {
  const [floor1, floor2] = await Promise.all([
    prisma.floor.findUniqueOrThrow({ where: { number: 1 } }),
    prisma.floor.findUniqueOrThrow({ where: { number: FLOOR_NUMBER } }),
  ]);
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const missing = [...new Set(shops.map((shop) => shop.category))].filter((slug) => !categoryBySlug.has(slug));
  if (missing.length) throw new Error(`Missing categories: ${missing.join(', ')}`);
  if (new Set(shops.map((shop) => shop.slug)).size !== shops.length) throw new Error('Duplicate shop slugs');

  const currentStores = await prisma.store.count({ where: { floorId: floor2.id } });
  console.log(JSON.stringify({
    mode: process.env.APPLY_FLOOR2_REBUILD === 'YES' ? 'apply' : 'dry-run',
    currentStores,
    newStores: shops.length,
    verticals: verticals.map(({ name, code, block }) => ({ name, code, block })),
  }, null, 2));
  console.table(shops.map(({ name, category, x, y, block }) => ({ name, category, x, y, block })));
  if (process.env.APPLY_FLOOR2_REBUILD !== 'YES') return;

  await prisma.$transaction(async (tx) => {
    const oldStores = await tx.store.findMany({ where: { floorId: floor2.id } });
    const oldStoreIds = oldStores.map((store) => store.id);
    const oldObjects = await tx.mapObject.findMany({
      where: { floorId: floor2.id, OR: [{ type: MapObjectType.STORE }, { storeId: { in: oldStoreIds } }] },
    });
    const oldObjectIds = oldObjects.map((object) => object.id);
    const oldAnchors = await tx.routeNode.findMany({
      where: { floorId: floor2.id, OR: [{ type: RouteNodeType.STORE_ANCHOR }, { mapObjectId: { in: oldObjectIds } }] },
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
        data: {
          slug: `archived-${IMPORT_BATCH}-${index}-${store.slug}`.slice(0, 180),
          floorId: null,
          tenantId: null,
          isActive: false,
          isVisible: false,
        },
      });
    }
    const oldTenantIds = [...new Set(oldStores.map((store) => store.tenantId).filter(Boolean))] as string[];
    for (const tenantId of oldTenantIds) {
      if (await tx.store.count({ where: { tenantId, isActive: true } }) === 0) {
        await tx.tenant.update({ where: { id: tenantId }, data: { isActive: false } });
      }
    }

    const verticalNodeByKey = new Map<string, { id: string; x: number; y: number; floorId: string; block: Block }>();
    for (const vertical of verticals) {
      for (const [floor, position] of [[floor1, vertical.floor1], [floor2, vertical.floor2]] as const) {
        const existing = await tx.routeNode.findFirst({
          where: { floorId: floor.id, type: vertical.type, code: vertical.code },
        });
        const node = existing
          ? await tx.routeNode.update({
              where: { id: existing.id },
              data: { name: vertical.name, x: position.x, y: position.y, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: vertical.code } },
            })
          : await tx.routeNode.create({
              data: { floorId: floor.id, type: vertical.type, code: vertical.code, name: vertical.name, x: position.x, y: position.y, z: 0, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, number: vertical.code } },
            });
        verticalNodeByKey.set(`${floor.number}:${vertical.code}`, { ...node, block: vertical.block });
      }
    }

    const floor1Corridors = await tx.routeNode.findMany({
      where: { floorId: floor1.id, isActive: true, type: { in: [RouteNodeType.ROUTE_POINT, RouteNodeType.ENTRANCE, RouteNodeType.PANEL] } },
    });
    const floor2Corridors = await tx.routeNode.findMany({
      where: { floorId: floor2.id, isActive: true, type: RouteNodeType.ROUTE_POINT },
    });
    if (!floor1Corridors.length || !floor2Corridors.length) throw new Error('Route corridor is missing');

    for (const vertical of verticals) {
      for (const [floorNumber, corridors] of [[1, floor1Corridors], [2, floor2Corridors]] as const) {
        const node = verticalNodeByKey.get(`${floorNumber}:${vertical.code}`)!;
        const candidates = floorNumber === 2
          ? corridors.filter((point) => vertical.block === 'WEST' ? point.x < 600 : point.x >= 600)
          : corridors;
        const nearest = candidates.reduce((best, point) => distance(node, point) < distance(node, best) ? point : best);
        const alreadyLinked = await tx.routeEdge.findFirst({
          where: { isActive: true, OR: [{ fromNodeId: node.id, toNodeId: nearest.id }, { fromNodeId: nearest.id, toNodeId: node.id }] },
        });
        if (!alreadyLinked) {
          const d = distance(node, nearest);
          await tx.routeEdge.create({ data: { floorId: node.floorId, fromNodeId: node.id, toNodeId: nearest.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH } } });
        }
      }
    }

    for (const [index, shop] of shops.entries()) {
      const category = categoryBySlug.get(shop.category)!;
      let slug = shop.slug;
      if (await tx.store.findUnique({ where: { slug }, select: { id: true } })) slug = `${shop.slug}-floor-2`;
      if (await tx.store.findUnique({ where: { slug }, select: { id: true } })) throw new Error(`Cannot allocate slug for ${shop.name}`);
      const tenant = await tx.tenant.create({ data: { name: shop.name, isActive: true } });
      const store = await tx.store.create({ data: { name: shop.name, slug, tenantId: tenant.id, categoryId: category.id, floorId: floor2.id, searchKeywords: `${shop.name} ${shop.category}`, isActive: true, isVisible: true } });
      const object = await tx.mapObject.create({ data: { type: MapObjectType.STORE, name: shop.name, floorId: floor2.id, storeId: store.id, categoryId: category.id, x: shop.x, y: shop.y, z: 0, width: 24, height: 18, sortOrder: index, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, block: shop.block } } });
      const anchor = await tx.routeNode.create({ data: { floorId: floor2.id, type: RouteNodeType.STORE_ANCHOR, name: `Вход: ${shop.name}`, x: shop.anchorX, y: shop.anchorY, z: 0, mapObjectId: object.id, sortOrder: index, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, block: shop.block } } });
      const candidates = floor2Corridors.filter((point) => shop.block === 'WEST' ? point.x < 600 : point.x >= 600);
      const nearest = candidates.reduce((best, point) => distance(anchor, point) < distance(anchor, best) ? point : best);
      const d = distance(anchor, nearest);
      await tx.routeEdge.create({ data: { floorId: floor2.id, fromNodeId: anchor.id, toNodeId: nearest.id, distance: d, weight: d, isBidirectional: true, isActive: true, metadata: { source: '2GIS', importBatch: IMPORT_BATCH, block: shop.block } } });
    }
  }, { timeout: 120_000 });

  const [storeCount, anchorCount] = await Promise.all([
    prisma.store.count({ where: { floorId: floor2.id, isActive: true } }),
    prisma.routeNode.count({ where: { floorId: floor2.id, type: RouteNodeType.STORE_ANCHOR, isActive: true } }),
  ]);
  console.log(JSON.stringify({ applied: true, storeCount, anchorCount }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
