import { PrismaClient, MapObjectType, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();
const FLOOR_NUMBER = 1;
const IMPORT_BATCH = '2gis-floor1-2026-11-06';

type Shop = {
  name: string;
  slug: string;
  category: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
};

const shops: Shop[] = [
  { name: 'GLORIA JEANS', slug: 'gloria-jeans', category: 'clothing', x: 367, y: 140, anchorX: 367, anchorY: 300 },
  { name: 'Пятёрочка', slug: 'pyaterochka', category: 'groceries', x: 108, y: 287, anchorX: 108, anchorY: 340 },
  { name: '5Post', slug: '5post', category: 'services', x: 116, y: 345, anchorX: 116, anchorY: 340 },
  { name: "O'STIN", slug: 'ostin', category: 'clothing', x: 204, y: 327, anchorX: 204, anchorY: 390 },
  { name: 'ЯХОНТ', slug: 'yahont', category: 'beauty-and-health', x: 110, y: 417, anchorX: 110, anchorY: 390 },
  { name: 'Тимка', slug: 'timka', category: 'cafes-and-restaurants', x: 37, y: 436, anchorX: 52, anchorY: 390 },
  { name: 'МегаФон | Yota', slug: 'megafon-yota', category: 'electronics', x: 167, y: 423, anchorX: 167, anchorY: 423 },
  { name: 'BEFREE', slug: 'befree', category: 'clothing', x: 265, y: 406, anchorX: 265, anchorY: 390 },
  { name: 'Зоомаркет', slug: 'zoomarket', category: 'home-goods', x: 114, y: 480, anchorX: 114, anchorY: 430 },
  { name: 'Katrin', slug: 'katrin', category: 'clothing', x: 138, y: 480, anchorX: 138, anchorY: 430 },
  { name: 'For you', slug: 'for-you', category: 'electronics', x: 205, y: 477, anchorX: 205, anchorY: 477 },
  { name: 'ELITA', slug: 'elita', category: 'home-goods', x: 331, y: 476, anchorX: 331, anchorY: 430 },
  { name: 'Бургер Кинг', slug: 'burger-king', category: 'cafes-and-restaurants', x: 54, y: 567, anchorX: 54, anchorY: 420 },
  { name: 'Uvenco', slug: 'uvenco', category: 'services', x: 200, y: 546, anchorX: 200, anchorY: 500 },
  { name: 'ЛЭТУАЛЬ', slug: 'letual', category: 'beauty-and-health', x: 251, y: 550, anchorX: 251, anchorY: 420 },
  { name: 'VendShop', slug: 'vendshop', category: 'services', x: 173, y: 584, anchorX: 173, anchorY: 510 },
  { name: 'Good lucky', slug: 'good-lucky', category: 'entertainment', x: 200, y: 584, anchorX: 200, anchorY: 510 },
  { name: 'Ещё', slug: 'eshche', category: 'groceries', x: 535, y: 289, anchorX: 535, anchorY: 325 },
  { name: 'X-MAN', slug: 'x-man', category: 'clothing', x: 368, y: 421, anchorX: 368, anchorY: 390 },
  { name: 'ПОДРУЖКА', slug: 'podruzhka', category: 'beauty-and-health', x: 546, y: 411, anchorX: 546, anchorY: 390 },
  { name: 'МАГНИТ КОСМЕТИК', slug: 'magnit-kosmetik', category: 'beauty-and-health', x: 676, y: 309, anchorX: 676, anchorY: 358 },
  { name: 'Студия наращивания волос', slug: 'studiya-narashchivaniya-volos', category: 'beauty-and-health', x: 617, y: 433, anchorX: 617, anchorY: 430 },
  { name: 'Горячие слойки', slug: 'goryachie-sloyki', category: 'cafes-and-restaurants', x: 650, y: 455, anchorX: 650, anchorY: 455 },
  { name: 'POLARIS', slug: 'polaris', category: 'electronics', x: 386, y: 503, anchorX: 386, anchorY: 430 },
  { name: 'SOKOLOV', slug: 'sokolov', category: 'beauty-and-health', x: 462, y: 519, anchorX: 462, anchorY: 480 },
  { name: 'Додо Пицца', slug: 'dodo-pizza', category: 'cafes-and-restaurants', x: 394, y: 589, anchorX: 394, anchorY: 420 },
  { name: 'ROMANTIC', slug: 'romantic', category: 'clothing', x: 544, y: 537, anchorX: 544, anchorY: 433 },
  { name: 'Улыбка радуги', slug: 'ulybka-radugi', category: 'beauty-and-health', x: 628, y: 547, anchorX: 628, anchorY: 433 },
  { name: 'Зодиак', slug: 'zodiak', category: 'beauty-and-health', x: 606, y: 590, anchorX: 606, anchorY: 510 },
  { name: 'Аптека Эконом', slug: 'apteka-ekonom', category: 'beauty-and-health', x: 647, y: 590, anchorX: 647, anchorY: 510 },
  { name: 'МАГНИТ', slug: 'magnit', category: 'groceries', x: 747, y: 326, anchorX: 747, anchorY: 366 },
  { name: 'Усадьба', slug: 'usadba', category: 'cafes-and-restaurants', x: 803, y: 381, anchorX: 785, anchorY: 400 },
  { name: 'Автобусная касса', slug: 'avtobusnaya-kassa', category: 'services', x: 807, y: 428, anchorX: 780, anchorY: 428 },
  { name: 'Little Tokyo Bubble Tea', slug: 'little-tokyo-bubble-tea', category: 'cafes-and-restaurants', x: 693, y: 442, anchorX: 693, anchorY: 455 },
  { name: "O'juvi parfum", slug: 'ojuvi-parfum', category: 'beauty-and-health', x: 777, y: 460, anchorX: 750, anchorY: 460 },
  { name: 'МТС', slug: 'mts', category: 'electronics', x: 762, y: 517, anchorX: 762, anchorY: 480 },
  { name: 'Банк ВТБ', slug: 'bank-vtb', category: 'atms', x: 821, y: 509, anchorX: 790, anchorY: 509 },
  { name: '9:41', slug: '9-41', category: 'electronics', x: 689, y: 570, anchorX: 675, anchorY: 500 },
  { name: 'АКВАРЕЛЬКА', slug: 'akvarelka', category: 'kids-goods', x: 735, y: 581, anchorX: 735, anchorY: 510 },
  { name: 'Студия шаров Пати декор', slug: 'pati-dekor', category: 'entertainment', x: 689, y: 590, anchorX: 705, anchorY: 510 },
  { name: 'ArtGold', slug: 'artgold', category: 'beauty-and-health', x: 654, y: 464, anchorX: 654, anchorY: 440 },
  { name: 'Hohoro coffee', slug: 'hohoro-coffee', category: 'cafes-and-restaurants', x: 736, y: 562, anchorX: 736, anchorY: 500 },
];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

async function main() {
  const floor = await prisma.floor.findUniqueOrThrow({ where: { number: FLOOR_NUMBER } });
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const missingCategories = [...new Set(shops.map((shop) => shop.category))].filter(
    (slug) => !categoryBySlug.has(slug),
  );
  if (missingCategories.length) throw new Error(`Missing categories: ${missingCategories.join(', ')}`);

  const duplicates = shops.filter(
    (shop, index) => shops.findIndex((candidate) => candidate.slug === shop.slug) !== index,
  );
  if (duplicates.length) throw new Error(`Duplicate slugs: ${duplicates.map((shop) => shop.slug).join(', ')}`);

  const currentStores = await prisma.store.findMany({ where: { floorId: floor.id } });
  console.log(JSON.stringify({ mode: process.env.APPLY_FLOOR1_REBUILD === 'YES' ? 'apply' : 'dry-run', floor: floor.name, currentStores: currentStores.length, newStores: shops.length }, null, 2));
  console.table(shops.map(({ name, category, x, y, anchorX, anchorY }) => ({ name, category, x, y, anchorX, anchorY })));
  if (process.env.APPLY_FLOOR1_REBUILD !== 'YES') return;

  await prisma.$transaction(async (tx) => {
    const oldStores = await tx.store.findMany({ where: { floorId: floor.id } });
    const oldStoreIds = oldStores.map((store) => store.id);
    const oldObjects = await tx.mapObject.findMany({
      where: { floorId: floor.id, OR: [{ type: MapObjectType.STORE }, { storeId: { in: oldStoreIds } }] },
    });
    const oldObjectIds = oldObjects.map((object) => object.id);
    const oldAnchors = await tx.routeNode.findMany({
      where: { floorId: floor.id, OR: [{ type: RouteNodeType.STORE_ANCHOR }, { mapObjectId: { in: oldObjectIds } }] },
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
      const remaining = await tx.store.count({ where: { tenantId, isActive: true } });
      if (remaining === 0) await tx.tenant.update({ where: { id: tenantId }, data: { isActive: false } });
    }

    const corridorNodes = await tx.routeNode.findMany({
      where: {
        floorId: floor.id,
        isActive: true,
        type: { in: [RouteNodeType.ROUTE_POINT, RouteNodeType.ENTRANCE, RouteNodeType.INFO_DESK, RouteNodeType.PANEL] },
      },
    });
    if (!corridorNodes.length) throw new Error('No active corridor nodes found on floor 1');

    for (const [index, shop] of shops.entries()) {
      const category = categoryBySlug.get(shop.category)!;
      let storeSlug = shop.slug;
      if (await tx.store.findUnique({ where: { slug: storeSlug }, select: { id: true } })) {
        storeSlug = `${shop.slug}-floor-1`;
      }
      if (await tx.store.findUnique({ where: { slug: storeSlug }, select: { id: true } })) {
        throw new Error(`Cannot allocate a unique slug for ${shop.name}`);
      }
      const tenant = await tx.tenant.create({ data: { name: shop.name, isActive: true } });
      const store = await tx.store.create({
        data: {
          name: shop.name,
          slug: storeSlug,
          tenantId: tenant.id,
          categoryId: category.id,
          floorId: floor.id,
          searchKeywords: `${shop.name} ${shop.category}`,
          workingHours: { mon: { start: '10:00', end: '22:00' }, tue: { start: '10:00', end: '22:00' }, wed: { start: '10:00', end: '22:00' }, thu: { start: '10:00', end: '22:00' }, fri: { start: '10:00', end: '22:00' }, sat: { start: '10:00', end: '22:00' }, sun: { start: '10:00', end: '22:00' } },
          isActive: true,
          isVisible: true,
        },
      });
      const object = await tx.mapObject.create({
        data: {
          type: MapObjectType.STORE,
          name: shop.name,
          floorId: floor.id,
          storeId: store.id,
          categoryId: category.id,
          x: shop.x,
          y: shop.y,
          z: 0,
          width: 24,
          height: 18,
          metadata: { source: '2GIS', importBatch: IMPORT_BATCH },
          sortOrder: index,
          isActive: true,
        },
      });
      const anchor = await tx.routeNode.create({
        data: {
          floorId: floor.id,
          type: RouteNodeType.STORE_ANCHOR,
          name: `Вход: ${shop.name}`,
          x: shop.anchorX,
          y: shop.anchorY,
          z: 0,
          mapObjectId: object.id,
          metadata: { source: '2GIS', importBatch: IMPORT_BATCH },
          sortOrder: index,
          isActive: true,
        },
      });
      const nearest = corridorNodes.reduce((best, node) =>
        distance(anchor, node) < distance(anchor, best) ? node : best,
      );
      const edgeDistance = distance(anchor, nearest);
      await tx.routeEdge.create({
        data: {
          floorId: floor.id,
          fromNodeId: anchor.id,
          toNodeId: nearest.id,
          distance: edgeDistance,
          weight: edgeDistance,
          isBidirectional: true,
          metadata: { source: '2GIS', importBatch: IMPORT_BATCH },
          isActive: true,
        },
      });
    }
  }, { timeout: 120_000 });

  const importedStores = await prisma.store.count({ where: { floorId: floor.id, isActive: true } });
  const importedAnchors = await prisma.routeNode.count({ where: { floorId: floor.id, isActive: true, type: RouteNodeType.STORE_ANCHOR } });
  console.log(JSON.stringify({ applied: true, importedStores, importedAnchors }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
