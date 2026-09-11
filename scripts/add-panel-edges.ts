import { PrismaClient, RouteNodeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panel = await prisma.routeNode.findFirst({
    where: { type: 'PANEL', isActive: true },
    include: { floor: true },
  });

  if (!panel) {
    console.log('PANEL not found');
    return;
  }

  console.log('Found PANEL', panel.id, 'floor', panel.floorId, panel.floor?.number);

  const candidates = await prisma.routeNode.findMany({
    where: {
      floorId: panel.floorId,
      isActive: true,
      type: { in: [RouteNodeType.ROUTE_POINT, RouteNodeType.ELEVATOR, RouteNodeType.PANEL, RouteNodeType.STORE_ANCHOR, RouteNodeType.ENTRANCE] },
    },
    include: { floor: true },
  });

  const withDist = candidates
    .map((n) => ({ ...n, dist: Math.hypot(n.x - panel.x, n.y - panel.y) }))
    .filter((n) => n.dist > 0)
    .sort((a, b) => a.dist - b.dist);

  console.log('Closest nodes:');
  withDist.slice(0, 10).forEach((n) => console.log(' ', n.id, n.type, 'dist', Math.round(n.dist)));

  let created = 0;
  for (const node of withDist.slice(0, 8)) {
    const existing = await prisma.routeEdge.findFirst({
      where: {
        OR: [
          { fromNodeId: panel.id, toNodeId: node.id },
          { fromNodeId: node.id, toNodeId: panel.id },
        ],
      },
    });

    if (existing) {
      console.log('skip', node.id, 'already exists', existing.id);
      continue;
    }

    const edge = await prisma.routeEdge.create({
      data: {
        floorId: panel.floorId,
        fromNodeId: panel.id,
        toNodeId: node.id,
        distance: Math.round(node.dist),
        isBidirectional: true,
      },
    });

    console.log('created', edge.id, 'dist', edge.distance);
    created += 1;
  }

  console.log('created edges:', created);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
