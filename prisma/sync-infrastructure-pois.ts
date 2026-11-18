import { MapObjectType, PrismaClient, RouteEdgeType, RouteNodeType } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();
const source = 'verified-infrastructure-pois-2026-11-18';

type Poi = {
  floor: number;
  slug: string;
  name: string;
  description: string;
  category: 'infrastructure' | 'toilets';
  objectType: MapObjectType;
  nodeType: RouteNodeType;
  visual: [number, number];
  approach: [number, number];
  nodeCode?: string;
};

const pois: Poi[] = [
  { floor: 1, slug: 'lift-1-floor-1', name: 'Лифт 1', description: 'Лифт в западном блоке', category: 'infrastructure', objectType: MapObjectType.ELEVATOR, nodeType: RouteNodeType.ELEVATOR, visual: [314, 382], approach: [316, 391], nodeCode: '1' },
  { floor: 1, slug: 'lift-2-floor-1', name: 'Лифт 2', description: 'Лифт в восточном блоке', category: 'infrastructure', objectType: MapObjectType.ELEVATOR, nodeType: RouteNodeType.ELEVATOR, visual: [782, 395], approach: [774, 400], nodeCode: '2' },
  { floor: 2, slug: 'lift-1-floor-2', name: 'Лифт 1', description: 'Лифт в западном блоке', category: 'infrastructure', objectType: MapObjectType.ELEVATOR, nodeType: RouteNodeType.ELEVATOR, visual: [335, 384], approach: [336, 390], nodeCode: '1' },
  { floor: 2, slug: 'lift-2-floor-2', name: 'Лифт 2', description: 'Лифт в восточном блоке', category: 'infrastructure', objectType: MapObjectType.ELEVATOR, nodeType: RouteNodeType.ELEVATOR, visual: [825, 430], approach: [835, 430], nodeCode: '2' },
  { floor: 3, slug: 'lift-2-floor-3', name: 'Лифт 2', description: 'Пассажирский лифт', category: 'infrastructure', objectType: MapObjectType.ELEVATOR, nodeType: RouteNodeType.ELEVATOR, visual: [578, 325], approach: [585, 325], nodeCode: '2' },
  { floor: 4, slug: 'lift-2-floor-4', name: 'Лифт 2', description: 'Пассажирский лифт', category: 'infrastructure', objectType: MapObjectType.ELEVATOR, nodeType: RouteNodeType.ELEVATOR, visual: [620, 302], approach: [629, 302], nodeCode: '2' },
  { floor: 1, slug: 'toilet-west-floor-1', name: 'Туалет — западный', description: 'Туалет возле ЛЭТУАЛЬ', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [280, 429], approach: [251, 414] },
  { floor: 1, slug: 'toilet-middle-floor-1', name: 'Туалет — центральный', description: 'Туалет за студией наращивания волос', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [621, 332], approach: [621, 343] },
  { floor: 1, slug: 'toilet-east-floor-1', name: 'Туалет — восточный', description: 'Туалет возле автовокзала', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [842, 346], approach: [807, 362] },
  { floor: 2, slug: 'toilet-west-floor-2', name: 'Туалет — западный', description: 'Туалет в западном блоке', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [295, 440], approach: [273, 410] },
  { floor: 2, slug: 'toilet-east-floor-2', name: 'Туалет — восточный', description: 'Туалет возле Метрологии', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [880, 335], approach: [862, 384] },
  { floor: 3, slug: 'toilet-east-floor-3', name: 'Туалет', description: 'Туалет в восточном блоке', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [690, 200], approach: [615, 200] },
  { floor: 4, slug: 'toilet-east-floor-4', name: 'Туалет', description: 'Туалет в восточном блоке', category: 'toilets', objectType: MapObjectType.TOILET, nodeType: RouteNodeType.TOILET, visual: [770, 90], approach: [613, 90] },
];

const pointCode = (floor: number, [x, y]: [number, number]) => `model-verified-corridors-2026-11-12:${floor}:${x}_${y}`;

async function main() {
  const apply = process.env.APPLY_INFRASTRUCTURE_POIS === 'YES';
  const floors = await prisma.floor.findMany({ where: { number: { in: [1, 2, 3, 4] } } });
  const floorByNumber = new Map(floors.map(floor => [floor.number, floor]));
  const categories = await prisma.category.findMany({ where: { slug: { in: ['infrastructure', 'toilets'] } } });
  const categoryBySlug = new Map(categories.map(category => [category.slug, category]));
  if (floors.length !== 4 || categories.length !== 2) throw new Error('Required floors or categories are missing');

  for (const poi of pois) {
    const floor = floorByNumber.get(poi.floor)!;
    const corridorPoint = await prisma.routeNode.findFirst({ where: { floorId: floor.id, code: pointCode(poi.floor, poi.approach), type: RouteNodeType.ROUTE_POINT, isActive: true } });
    if (!corridorPoint) throw new Error(`Verified corridor point missing for ${poi.slug}`);
    if (poi.nodeCode) {
      const node = await prisma.routeNode.findFirst({ where: { floorId: floor.id, type: poi.nodeType, code: poi.nodeCode, isActive: true } });
      if (!node || node.x !== poi.approach[0] || node.y !== poi.approach[1]) throw new Error(`Lift node changed for ${poi.slug}`);
    }
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', pois: pois.length, lifts: pois.filter(p => p.nodeType === RouteNodeType.ELEVATOR).length, toilets: pois.filter(p => p.nodeType === RouteNodeType.TOILET).length }, null, 2));
  if (!apply) return;

  const existingStores = await prisma.store.findMany({ where: { slug: { in: pois.map(p => p.slug) } } });
  const existingObjects = await prisma.mapObject.findMany({ where: { metadata: { path: ['source'], equals: source } } });
  const affectedNodes = await prisma.routeNode.findMany({ where: { floorId: { in: floors.map(f => f.id) }, OR: [{ type: RouteNodeType.ELEVATOR }, { type: RouteNodeType.TOILET }] } });
  const affectedEdges = await prisma.routeEdge.findMany({ where: { OR: [{ fromNodeId: { in: affectedNodes.map(n => n.id) } }, { toNodeId: { in: affectedNodes.map(n => n.id) } }] } });
  const backupDir = resolve(process.cwd(), '../route-audit');
  await mkdir(backupDir, { recursive: true });
  const backup = resolve(backupDir, `infrastructure-backup-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify({ existingStores, existingObjects, affectedNodes, affectedEdges }, null, 2), { flag: 'wx' });

  await prisma.$transaction(async tx => {
    for (const [index, poi] of pois.entries()) {
      const floor = floorByNumber.get(poi.floor)!;
      const category = categoryBySlug.get(poi.category)!;
      const existingStore = await tx.store.findUnique({ where: { slug: poi.slug } });
      const tenantMarker = `${source}:${poi.slug}`;
      let tenantId = existingStore?.tenantId ?? null;
      if (!tenantId) {
        const existingTenant = await tx.tenant.findFirst({ where: { name: poi.name, description: tenantMarker } });
        const tenant = existingTenant ?? await tx.tenant.create({ data: { name: poi.name, description: tenantMarker, isActive: true } });
        tenantId = tenant.id;
      }
      const store = await tx.store.upsert({
        where: { slug: poi.slug },
        update: { name: poi.name, description: poi.description, tenantId, floorId: floor.id, categoryId: category.id, searchKeywords: `${poi.name} ${poi.category} лифт туалет санузел уборная`, isActive: true, isVisible: true },
        create: { slug: poi.slug, name: poi.name, description: poi.description, tenantId, floorId: floor.id, categoryId: category.id, searchKeywords: `${poi.name} ${poi.category} лифт туалет санузел уборная`, isActive: true, isVisible: true },
      });
      const externalObjectId = `${source}:${poi.slug}`;
      const objectData = { type: poi.objectType, name: poi.name, description: poi.description, floorId: floor.id, storeId: store.id, categoryId: category.id, x: poi.visual[0], y: poi.visual[1], z: 0, width: 24, height: 24, isActive: true, sortOrder: 1000 + index, metadata: { source, visualOnly: true, greenMall: { primaryMapObjectForStoreId: store.id } } };
      const existingObject = await tx.mapObject.findFirst({ where: { externalObjectId } });
      const object = existingObject
        ? await tx.mapObject.update({ where: { id: existingObject.id }, data: objectData })
        : await tx.mapObject.create({ data: { ...objectData, externalObjectId } });

      let node = poi.nodeCode
        ? await tx.routeNode.findFirstOrThrow({ where: { floorId: floor.id, type: poi.nodeType, code: poi.nodeCode, isActive: true } })
        : await tx.routeNode.findFirst({ where: { floorId: floor.id, type: poi.nodeType, code: `${source}:${poi.slug}` } });
      const previousMetadata = node?.metadata && typeof node.metadata === 'object' && !Array.isArray(node.metadata)
        ? node.metadata as Record<string, unknown>
        : {};
      const nodeData = { name: poi.name, floorId: floor.id, type: poi.nodeType, x: poi.approach[0], y: poi.approach[1], z: 0, mapObjectId: object.id, isActive: true, metadata: { ...previousMetadata, infrastructureSource: source, greenMall: { primaryRouteNodeForStoreId: store.id }, ...(poi.nodeCode ? { number: poi.nodeCode } : {}) } };
      node = node
        ? await tx.routeNode.update({ where: { id: node.id }, data: nodeData })
        : await tx.routeNode.create({ data: { ...nodeData, code: `${source}:${poi.slug}` } });

      const corridorPoint = await tx.routeNode.findFirstOrThrow({ where: { floorId: floor.id, code: pointCode(poi.floor, poi.approach), type: RouteNodeType.ROUTE_POINT, isActive: true } });
      const edgeData = { floorId: floor.id, type: poi.nodeType === RouteNodeType.ELEVATOR ? RouteEdgeType.WALKWAY : RouteEdgeType.TOILET, distance: 1, weight: 1, isBidirectional: true, isActive: true, metadata: { source } };
      await tx.routeEdge.upsert({ where: { fromNodeId_toNodeId: { fromNodeId: node.id, toNodeId: corridorPoint.id } }, update: edgeData, create: { ...edgeData, fromNodeId: node.id, toNodeId: corridorPoint.id } });
    }
  }, { timeout: 120000 });
  console.log(`Applied. Recoverable snapshot: ${backup}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
