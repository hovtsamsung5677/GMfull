import { Prisma } from "@prisma/client";

interface PublicPromotionTenantConsistencyRecord {
  tenantId: string | null;
  store: {
    tenantId: string | null;
  } | null;
}

export function buildPublicPromotionWhere(
  now: Date,
  storeId?: string,
): Prisma.PromotionWhereInput {
  return {
    isActive: true,
    deletedAt: null,
    storeId: storeId ?? { not: null },
    tenantId: { not: null },
    store: {
      is: {
        isActive: true,
        isVisible: true,
      },
    },
    tenant: {
      is: {
        isActive: true,
      },
    },
    AND: [
      {
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
      {
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    ],
  };
}

export function hasConsistentPublicPromotionTenant(
  promotion: PublicPromotionTenantConsistencyRecord,
): boolean {
  return (
    promotion.tenantId !== null &&
    promotion.store !== null &&
    promotion.store.tenantId === promotion.tenantId
  );
}
