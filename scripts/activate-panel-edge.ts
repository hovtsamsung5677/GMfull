import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panelId = 'cmtohvz58000fessc4tcvuqwg';
  const targetId = 'cmtoi9xe9001jessc83jnl1pn';

  const existing = await prisma.routeEdge.findFirst({
    where: {
      OR: [
        { fromNodeId: panelId, toNodeId: targetId },
        { fromNodeId: targetId, toNodeId: panelId },
      ],
    },
  });

  if (existing) {
    const updated = await prisma.routeEdge.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    console.log('activated', updated.id);
  } else {
    const created = await prisma.routeEdge.create({
      data: {
        floorId: 'cmsg4tkdv000kesdc3mqcgv9j',
        fromNodeId: panelId,
        toNodeId: targetId,
        distance: 67,
        isBidirectional: true,
        isActive: true,
      },
    });
    console.log('created', created.id);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
