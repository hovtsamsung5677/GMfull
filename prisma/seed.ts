import {
  MapObjectType,
  Prisma,
  PrismaClient,
  RouteNodeType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type TenantSeed = {
  name: string;
  description?: string;
};

type StoreSeed = {
  name: string;
  slug: string;
  tenantId: string;
  categoryId: string;
  floorId: string;
  roomNumber: string;
  description?: string;
  searchKeywords: string;
};

type MapObjectSeed = {
  externalObjectId: string;
  floorId: string;
  type: MapObjectType;
  name: string;
  description?: string;
  storeId?: string | null;
  categoryId?: string | null;
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
  sortOrder: number;
  metadata?: Prisma.InputJsonValue;
  geometry?: Prisma.InputJsonValue;
};

type RouteNodeSeed = {
  floorId: string;
  type: RouteNodeType;
  name: string;
  code: string;
  x: number;
  y: number;
  z: number;
  mapObjectId?: string | null;
  sortOrder: number;
  metadata?: Prisma.InputJsonValue;
};

async function upsertTenantByName(data: TenantSeed) {
  const tenants = await prisma.tenant.findMany({
    where: { name: data.name },
    orderBy: { createdAt: 'asc' },
  });
  const [tenant, ...duplicates] = tenants;

  if (tenant) {
    if (duplicates.length > 0) {
      await prisma.tenant.updateMany({
        where: { id: { in: duplicates.map((duplicate) => duplicate.id) } },
        data: { isActive: false },
      });
    }

    return prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        description: data.description,
        isActive: true,
      },
    });
  }

  return prisma.tenant.create({
    data: {
      ...data,
      isActive: true,
    },
  });
}

async function upsertStoreBySlug(data: StoreSeed) {
  return prisma.store.upsert({
    where: { slug: data.slug },
    update: {
      name: data.name,
      tenantId: data.tenantId,
      categoryId: data.categoryId,
      floorId: data.floorId,
      roomNumber: data.roomNumber,
      description: data.description,
      searchKeywords: data.searchKeywords,
      isActive: true,
      isVisible: true,
    },
    create: {
      ...data,
      isActive: true,
      isVisible: true,
    },
  });
}

async function upsertMapObjectByExternalId(data: MapObjectSeed) {
  const objects = await prisma.mapObject.findMany({
    where: {
      floorId: data.floorId,
      OR: [
        { externalObjectId: data.externalObjectId },
        ...(data.storeId ? [{ storeId: data.storeId }] : []),
        { type: data.type, name: data.name },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  const [object, ...duplicates] = objects;

  const objectData = {
    type: data.type,
    name: data.name,
    description: data.description,
    floorId: data.floorId,
    storeId: data.storeId,
    categoryId: data.categoryId,
    x: data.x,
    y: data.y,
    z: data.z,
    width: data.width,
    height: data.height,
    externalObjectId: data.externalObjectId,
    geometry: data.geometry,
    metadata: data.metadata,
    sortOrder: data.sortOrder,
    isActive: true,
  };

  if (object) {
    if (duplicates.length > 0) {
      await prisma.mapObject.updateMany({
        where: { id: { in: duplicates.map((duplicate) => duplicate.id) } },
        data: { isActive: false },
      });
    }

    return prisma.mapObject.update({
      where: { id: object.id },
      data: objectData,
    });
  }

  return prisma.mapObject.create({
    data: objectData,
  });
}

async function upsertRouteNodeByCode(data: RouteNodeSeed) {
  const nodes = await prisma.routeNode.findMany({
    where: {
      floorId: data.floorId,
      code: data.code,
    },
    orderBy: { createdAt: 'asc' },
  });
  const [node, ...duplicates] = nodes;

  const nodeData = {
    floorId: data.floorId,
    type: data.type,
    name: data.name,
    code: data.code,
    x: data.x,
    y: data.y,
    z: data.z,
    mapObjectId: data.mapObjectId,
    metadata: data.metadata,
    sortOrder: data.sortOrder,
    isActive: true,
  };

  if (node) {
    if (duplicates.length > 0) {
      await prisma.routeNode.updateMany({
        where: { id: { in: duplicates.map((duplicate) => duplicate.id) } },
        data: { isActive: false },
      });
    }

    return prisma.routeNode.update({
      where: { id: node.id },
      data: nodeData,
    });
  }

  return prisma.routeNode.create({
    data: nodeData,
  });
}

async function upsertRouteEdge(params: {
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number;
  weight?: number;
  isBidirectional?: boolean;
  label: string;
}) {
  const edges = await prisma.routeEdge.findMany({
    where: {
      floorId: params.floorId,
      OR: [
        {
          fromNodeId: params.fromNodeId,
          toNodeId: params.toNodeId,
        },
        {
          fromNodeId: params.toNodeId,
          toNodeId: params.fromNodeId,
          isBidirectional: true,
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  const [edge, ...duplicates] = edges;

  const edgeData = {
    floorId: params.floorId,
    fromNodeId: params.fromNodeId,
    toNodeId: params.toNodeId,
    distance: params.distance,
    weight: params.weight ?? params.distance,
    isBidirectional: params.isBidirectional ?? true,
    metadata: {
      label: params.label,
    },
    isActive: true,
  };

  if (edge) {
    if (duplicates.length > 0) {
      await prisma.routeEdge.updateMany({
        where: { id: { in: duplicates.map((duplicate) => duplicate.id) } },
        data: { isActive: false },
      });
    }

    return prisma.routeEdge.update({
      where: { id: edge.id },
      data: edgeData,
    });
  }

  return prisma.routeEdge.create({
    data: edgeData,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatSeedError(error: unknown): string {
  const message = getErrorMessage(error);

  if (
    message.includes("Can't reach database server") ||
    message.includes('connect ECONNREFUSED')
  ) {
    return [
      'Seed failed: PostgreSQL is not reachable.',
      'Check DATABASE_URL in .env and start PostgreSQL on the configured host/port.',
      `Current DATABASE_URL: ${process.env.DATABASE_URL ?? 'not set'}`,
    ].join('\n');
  }

  return `Seed failed: ${message}`;
}

async function main() {
  const roles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full access to all system sections.',
    },
    {
      name: 'MALL_ADMIN',
      description: 'Mall administrator with access to core content.',
    },
    {
      name: 'CONTENT_MANAGER',
      description: 'Content manager for stores, categories and promotions.',
    },
    {
      name: 'ADS_MANAGER',
      description: 'Advertising manager for campaigns and creatives.',
    },
    {
      name: 'ANALYTICS_VIEWER',
      description: 'Read-only analytics access.',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  const categories = [
    { name: '\u041e\u0434\u0435\u0436\u0434\u0430', slug: 'clothing' },
    { name: '\u041e\u0431\u0443\u0432\u044c', slug: 'shoes' },
    {
      name: '\u041a\u0430\u0444\u0435 \u0438 \u0440\u0435\u0441\u0442\u043e\u0440\u0430\u043d\u044b',
      slug: 'cafes-and-restaurants',
    },
    { name: '\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u044b', slug: 'groceries' },
    {
      name: '\u0414\u0435\u0442\u0441\u043a\u0438\u0435 \u0442\u043e\u0432\u0430\u0440\u044b',
      slug: 'kids-goods',
    },
    {
      name: '\u0420\u0430\u0437\u0432\u043b\u0435\u0447\u0435\u043d\u0438\u044f',
      slug: 'entertainment',
    },
    { name: '\u0423\u0441\u043b\u0443\u0433\u0438', slug: 'services' },
    { name: '\u0422\u0435\u0445\u043d\u0438\u043a\u0430', slug: 'electronics' },
    {
      name: '\u041a\u0440\u0430\u0441\u043e\u0442\u0430 \u0438 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435',
      slug: 'beauty-and-health',
    },
    { name: '\u0421\u043f\u043e\u0440\u0442', slug: 'sport' },
    {
      name: '\u0422\u043e\u0432\u0430\u0440\u044b \u0434\u043b\u044f \u0434\u043e\u043c\u0430',
      slug: 'home-goods',
    },
    {
      name: '\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430',
      slug: 'infrastructure',
    },
    { name: '\u0411\u0430\u043d\u043a\u043e\u043c\u0430\u0442\u044b', slug: 'atms' },
    { name: '\u0422\u0443\u0430\u043b\u0435\u0442\u044b', slug: 'toilets' },
    { name: '\u041f\u0430\u0440\u043a\u043e\u0432\u043a\u0430', slug: 'parking' },
  ];

  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: index,
      },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: index,
      },
    });
  }

  const floorNames: Record<number, string> = {
    '-1': '\u041f\u043e\u0434\u0432\u0430\u043b',
    1: '\u041f\u0435\u0440\u0432\u044b\u0439 \u044d\u0442\u0430\u0436',
    2: '\u0412\u0442\u043e\u0440\u043e\u0439 \u044d\u0442\u0430\u0436',
    3: '\u0422\u0440\u0435\u0442\u0438\u0439 \u044d\u0442\u0430\u0436',
    4: '\u0427\u0435\u0442\u0432\u0435\u0440\u0442\u044b\u0439 \u044d\u0442\u0430\u0436',
  };

  const firstFloor = await prisma.floor.upsert({
    where: { number: 1 },
    update: {
      name: floorNames[1],
      sortOrder: 1,
      width: 900,
      height: 600,
      depth: 120,
      unit: 'px',
      metadata: {
        scene: {
          origin: 'top-left',
          defaultCamera: { x: 450, y: 300, z: 900 },
        },
      },
      isActive: true,
    },
    create: {
      number: 1,
      name: floorNames[1],
      sortOrder: 1,
      width: 900,
      height: 600,
      depth: 120,
      unit: 'px',
      metadata: {
        scene: {
          origin: 'top-left',
          defaultCamera: { x: 450, y: 300, z: 900 },
        },
      },
      isActive: true,
    },
  });

  const [basementFloor, secondFloor, thirdFloor, fourthFloor] =
    await Promise.all(
      [-1, 2, 3, 4].map((number) =>
        prisma.floor.upsert({
          where: { number },
          update: {
            name: floorNames[number],
            sortOrder: number === -1 ? 0 : number,
            width: 900,
            height: 600,
            depth: 120,
            unit: 'px',
            metadata: {
              scene: {
                origin: 'top-left',
                defaultCamera: { x: 450, y: 300, z: 900 },
              },
            },
            isActive: true,
          },
          create: {
            number,
            name: floorNames[number],
            sortOrder: number === -1 ? 0 : number,
            width: 900,
            height: 600,
            depth: 120,
            unit: 'px',
            metadata: {
              scene: {
                origin: 'top-left',
                defaultCamera: { x: 450, y: 300, z: 900 },
              },
            },
            isActive: true,
          },
        }),
      ),
    );

  const [
    sportCategory,
    electronicsCategory,
    cafesCategory,
    infrastructureCategory,
    toiletsCategory,
  ] = await Promise.all([
    prisma.category.findUniqueOrThrow({ where: { slug: 'sport' } }),
    prisma.category.findUniqueOrThrow({ where: { slug: 'electronics' } }),
    prisma.category.findUniqueOrThrow({
      where: { slug: 'cafes-and-restaurants' },
    }),
    prisma.category.findUniqueOrThrow({ where: { slug: 'infrastructure' } }),
    prisma.category.findUniqueOrThrow({ where: { slug: 'toilets' } }),
  ]);

  const [sportmasterTenant, technoparkTenant, greenCoffeeTenant] =
    await Promise.all([
      upsertTenantByName({
        name: '\u0421\u043f\u043e\u0440\u0442\u043c\u0430\u0441\u0442\u0435\u0440',
        description: 'Test tenant for navigation graph.',
      }),
      upsertTenantByName({
        name: '\u0422\u0435\u0445\u043d\u043e\u043f\u0430\u0440\u043a',
        description: 'Test electronics tenant for navigation graph.',
      }),
      upsertTenantByName({
        name: '\u041a\u043e\u0444\u0435\u0439\u043d\u044f GREEN',
        description: 'Test cafe tenant for navigation graph.',
      }),
    ]);

  const [sportmasterStore, technoparkStore, greenCoffeeStore] =
    await Promise.all([
      upsertStoreBySlug({
        name: '\u0421\u043f\u043e\u0440\u0442\u043c\u0430\u0441\u0442\u0435\u0440',
        slug: 'sportmaster',
        tenantId: sportmasterTenant.id,
        categoryId: sportCategory.id,
        floorId: firstFloor.id,
        roomNumber: '1-101',
        description: 'Sport goods test store for route building.',
        searchKeywords:
          '\u0441\u043f\u043e\u0440\u0442 \u0441\u043f\u043e\u0440\u0442\u043c\u0430\u0441\u0442\u0435\u0440 sport sportmaster',
      }),
      upsertStoreBySlug({
        name: '\u0422\u0435\u0445\u043d\u043e\u043f\u0430\u0440\u043a',
        slug: 'technopark',
        tenantId: technoparkTenant.id,
        categoryId: electronicsCategory.id,
        floorId: firstFloor.id,
        roomNumber: '1-205',
        description: 'Electronics test store for route building.',
        searchKeywords:
          '\u0442\u0435\u0445\u043d\u0438\u043a\u0430 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u0438\u043a\u0430 technopark electronics',
      }),
      upsertStoreBySlug({
        name: '\u041a\u043e\u0444\u0435\u0439\u043d\u044f GREEN',
        slug: 'green-coffee',
        tenantId: greenCoffeeTenant.id,
        categoryId: cafesCategory.id,
        floorId: firstFloor.id,
        roomNumber: '1-050',
        description: 'Cafe test store for route building.',
        searchKeywords:
          '\u043a\u043e\u0444\u0435 \u043a\u0430\u0444\u0435 green coffee cafe',
      }),
    ]);

  const mainEntranceObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-main-entrance',
    floorId: firstFloor.id,
    type: MapObjectType.ENTRANCE,
    name: '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0432\u0445\u043e\u0434',
    categoryId: infrastructureCategory.id,
    x: 80,
    y: 520,
    z: 0,
    width: 120,
    height: 40,
    sortOrder: 10,
    metadata: { sceneRole: 'entrance' },
  });
  const panelObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-panel-1',
    floorId: firstFloor.id,
    type: MapObjectType.INFO,
    name: '\u041f\u0430\u043d\u0435\u043b\u044c \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438 1',
    categoryId: infrastructureCategory.id,
    x: 180,
    y: 440,
    z: 0,
    width: 40,
    height: 40,
    sortOrder: 20,
    metadata: { sceneRole: 'navigation-panel' },
  });
  const escalatorObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-escalator-1',
    floorId: firstFloor.id,
    type: MapObjectType.ESCALATOR,
    name: '\u042d\u0441\u043a\u0430\u043b\u0430\u0442\u043e\u0440',
    categoryId: infrastructureCategory.id,
    x: 260,
    y: 360,
    z: 0,
    width: 80,
    height: 30,
    sortOrder: 30,
    metadata: { sceneRole: 'vertical-transport' },
  });
  const liftObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-lift-1',
    floorId: firstFloor.id,
    type: MapObjectType.ELEVATOR,
    name: '\u041b\u0438\u0444\u0442',
    categoryId: infrastructureCategory.id,
    x: 420,
    y: 360,
    z: 0,
    width: 50,
    height: 50,
    sortOrder: 40,
    metadata: { sceneRole: 'vertical-transport' },
  });
  const toiletObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-toilet-1',
    floorId: firstFloor.id,
    type: MapObjectType.TOILET,
    name: '\u0422\u0443\u0430\u043b\u0435\u0442',
    categoryId: toiletsCategory.id,
    x: 500,
    y: 500,
    z: 0,
    width: 70,
    height: 50,
    sortOrder: 50,
    metadata: { sceneRole: 'amenity' },
  });
  const sportmasterObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-store-sportmaster',
    floorId: firstFloor.id,
    type: MapObjectType.STORE,
    name: '\u0421\u043f\u043e\u0440\u0442\u043c\u0430\u0441\u0442\u0435\u0440',
    storeId: sportmasterStore.id,
    categoryId: sportCategory.id,
    x: 620,
    y: 240,
    z: 0,
    width: 160,
    height: 100,
    sortOrder: 60,
    metadata: { sceneRole: 'store', roomNumber: '1-101' },
    geometry: {
      points: [
        [560, 200],
        [720, 200],
        [720, 300],
        [560, 300],
      ],
    },
  });
  const technoparkObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-store-technopark',
    floorId: firstFloor.id,
    type: MapObjectType.STORE,
    name: '\u0422\u0435\u0445\u043d\u043e\u043f\u0430\u0440\u043a',
    storeId: technoparkStore.id,
    categoryId: electronicsCategory.id,
    x: 720,
    y: 360,
    z: 0,
    width: 150,
    height: 90,
    sortOrder: 70,
    metadata: { sceneRole: 'store', roomNumber: '1-205' },
    geometry: {
      points: [
        [650, 325],
        [800, 325],
        [800, 415],
        [650, 415],
      ],
    },
  });
  const greenCoffeeObject = await upsertMapObjectByExternalId({
    externalObjectId: 'floor-1-store-green-coffee',
    floorId: firstFloor.id,
    type: MapObjectType.STORE,
    name: '\u041a\u043e\u0444\u0435\u0439\u043d\u044f GREEN',
    storeId: greenCoffeeStore.id,
    categoryId: cafesCategory.id,
    x: 360,
    y: 220,
    z: 0,
    width: 130,
    height: 80,
    sortOrder: 80,
    metadata: { sceneRole: 'store', roomNumber: '1-050' },
    geometry: {
      points: [
        [300, 185],
        [430, 185],
        [430, 265],
        [300, 265],
      ],
    },
  });

  const mainEntranceNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.ENTRANCE,
    name: '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0432\u0445\u043e\u0434',
    code: 'MAIN_ENTRANCE',
    x: 80,
    y: 520,
    z: 0,
    mapObjectId: mainEntranceObject.id,
    sortOrder: 10,
    metadata: { sceneRole: 'entrance' },
  });
  const panelNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.PANEL,
    name: '\u041f\u0430\u043d\u0435\u043b\u044c \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438 1',
    code: 'PANEL_1',
    x: 180,
    y: 440,
    z: 0,
    mapObjectId: panelObject.id,
    sortOrder: 20,
    metadata: { sceneRole: 'navigation-panel' },
  });
  const escalatorNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.ESCALATOR,
    name: '\u042d\u0441\u043a\u0430\u043b\u0430\u0442\u043e\u0440',
    code: 'ESCALATOR_1',
    x: 260,
    y: 360,
    z: 0,
    mapObjectId: escalatorObject.id,
    sortOrder: 30,
    metadata: { sceneRole: 'vertical-transport' },
  });
  const liftNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.ELEVATOR,
    name: '\u041b\u0438\u0444\u0442',
    code: 'LIFT_1',
    x: 420,
    y: 360,
    z: 0,
    mapObjectId: liftObject.id,
    sortOrder: 40,
    metadata: { sceneRole: 'vertical-transport' },
  });
  const toiletNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.TOILET,
    name: '\u0422\u0443\u0430\u043b\u0435\u0442',
    code: 'TOILET_1',
    x: 500,
    y: 500,
    z: 0,
    mapObjectId: toiletObject.id,
    sortOrder: 50,
    metadata: { sceneRole: 'amenity' },
  });
  const sportmasterNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.STORE_ANCHOR,
    name: '\u0421\u043f\u043e\u0440\u0442\u043c\u0430\u0441\u0442\u0435\u0440',
    code: 'STORE_SPORTMASTER',
    x: 620,
    y: 240,
    z: 0,
    mapObjectId: sportmasterObject.id,
    sortOrder: 60,
    metadata: { sceneRole: 'store-anchor', storeSlug: 'sportmaster' },
  });
  const technoparkNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.STORE_ANCHOR,
    name: '\u0422\u0435\u0445\u043d\u043e\u043f\u0430\u0440\u043a',
    code: 'STORE_TECHNOPARK',
    x: 720,
    y: 360,
    z: 0,
    mapObjectId: technoparkObject.id,
    sortOrder: 70,
    metadata: { sceneRole: 'store-anchor', storeSlug: 'technopark' },
  });
  const greenCoffeeNode = await upsertRouteNodeByCode({
    floorId: firstFloor.id,
    type: RouteNodeType.STORE_ANCHOR,
    name: '\u041a\u043e\u0444\u0435\u0439\u043d\u044f GREEN',
    code: 'STORE_GREEN_COFFEE',
    x: 360,
    y: 220,
    z: 0,
    mapObjectId: greenCoffeeObject.id,
    sortOrder: 80,
    metadata: { sceneRole: 'store-anchor', storeSlug: 'green-coffee' },
  });

  await Promise.all([
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: mainEntranceNode.id,
      toNodeId: panelNode.id,
      distance: 120,
      label: 'main-entrance-to-panel',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: panelNode.id,
      toNodeId: escalatorNode.id,
      distance: 110,
      label: 'panel-to-escalator',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: panelNode.id,
      toNodeId: liftNode.id,
      distance: 240,
      label: 'panel-to-lift',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: panelNode.id,
      toNodeId: greenCoffeeNode.id,
      distance: 180,
      label: 'panel-to-green-coffee',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: escalatorNode.id,
      toNodeId: sportmasterNode.id,
      distance: 220,
      label: 'escalator-to-sportmaster',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: escalatorNode.id,
      toNodeId: technoparkNode.id,
      distance: 260,
      label: 'escalator-to-technopark',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: liftNode.id,
      toNodeId: toiletNode.id,
      distance: 170,
      label: 'lift-to-toilet',
    }),
    upsertRouteEdge({
      floorId: firstFloor.id,
      fromNodeId: liftNode.id,
      toNodeId: sportmasterNode.id,
      distance: 230,
      label: 'lift-to-sportmaster',
    }),
  ]);

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'SUPER_ADMIN' },
  });
  const passwordHash = await bcrypt.hash('Admin12345!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@greenmall.local' },
    update: {
      passwordHash,
      name: 'Super Admin',
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      email: 'admin@greenmall.local',
      passwordHash,
      name: 'Super Admin',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  const allFloors = [
    firstFloor,
    basementFloor,
    secondFloor,
    thirdFloor,
    fourthFloor,
  ];

  for (const floor of allFloors) {
    const filename = `${floor.number}_floor.glb`;
    const existingAsset = await prisma.fileAsset.findFirst({
      where: { filename },
    });

    let asset;
    if (existingAsset) {
      asset = await prisma.fileAsset.update({
        where: { id: existingAsset.id },
        data: {
          url: `/floors/${filename}`,
          originalName: filename,
          mimeType: 'model/gltf-binary',
          path: `floors/${filename}`,
          provider: 'local',
          kind: 'MODEL_3D',
          isActive: true,
          uploadedById: superAdmin.id,
        },
      });
    } else {
      asset = await prisma.fileAsset.create({
        data: {
          filename,
          url: `/floors/${filename}`,
          originalName: filename,
          mimeType: 'model/gltf-binary',
          path: `floors/${filename}`,
          provider: 'local',
          kind: 'MODEL_3D',
          isActive: true,
          uploadedById: superAdmin.id,
        },
      });
    }

    await prisma.floor.update({
      where: { id: floor.id },
      data: { modelAssetId: asset.id },
    });
  }

  console.log('Seed data created.');
}

main()
  .catch((error) => {
    console.error(formatSeedError(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
