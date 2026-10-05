import { Prisma } from "@prisma/client";
import { AdCampaignAdminResponseDto } from "./dto/ad-campaign-admin-response.dto";

export const adCampaignAdminInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  targetStore: {
    select: {
      id: true,
      name: true,
      slug: true,
      tenantId: true,
      isActive: true,
      isVisible: true,
    },
  },
  targetPromotion: {
    select: {
      id: true,
      title: true,
      slug: true,
      tenantId: true,
      storeId: true,
      isActive: true,
      deletedAt: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  _count: {
    select: {
      creatives: {
        where: {
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.AdCampaignInclude;

export type AdCampaignAdminRecord = Prisma.AdCampaignGetPayload<{
  include: typeof adCampaignAdminInclude;
}>;

export function toAdCampaignAdminResponse(
  campaign: AdCampaignAdminRecord,
): AdCampaignAdminResponseDto {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    tenantId: campaign.tenantId,
    placement: campaign.placement,
    targetType: campaign.targetType,
    targetStoreId: campaign.targetStoreId,
    targetPromotionId: campaign.targetPromotionId,
    targetUrl: campaign.targetUrl,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    priority: campaign.priority,
    impressionLimit: campaign.impressionLimit,
    isActive: campaign.isActive,
    metadata: campaign.metadata,
    deletedAt: campaign.deletedAt,
    createdById: campaign.createdById,
    updatedById: campaign.updatedById,
    tenant: campaign.tenant,
    targetStore: campaign.targetStore,
    targetPromotion: campaign.targetPromotion,
    createdBy: campaign.createdBy,
    updatedBy: campaign.updatedBy,
    creativesCount: campaign._count.creatives,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}
