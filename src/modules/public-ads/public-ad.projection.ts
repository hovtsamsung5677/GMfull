import { AdTargetType, FileAssetKind, Prisma } from "@prisma/client";
import {
  publicFileAssetSelect,
  toPublicFileAssetResponse,
} from "../file-assets/public-file-asset.projection";
import { hasConsistentPublicPromotionTenant } from "../promotions/promotion-public.eligibility";
import { PublicAdDeliveryResponseDto } from "./dto/public-ad-response.dto";

export const publicAdCreativeWhere = {
  isActive: true,
  deletedAt: null,
  assetId: { not: null },
  asset: {
    is: {
      isActive: true,
      kind: FileAssetKind.IMAGE,
    },
  },
} satisfies Prisma.AdCreativeWhereInput;

export const publicAdCandidateSelect = {
  campaign: {
    select: {
      id: true,
      impressionLimit: true,
      tenantId: true,
      targetType: true,
      targetUrl: true,
      targetStore: {
        select: {
          id: true,
          slug: true,
          name: true,
          tenantId: true,
        },
      },
      targetPromotion: {
        select: {
          id: true,
          slug: true,
          title: true,
          tenantId: true,
          store: {
            select: {
              tenantId: true,
            },
          },
        },
      },
      creatives: {
        where: publicAdCreativeWhere,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
        take: 1,
        select: {
          id: true,
          title: true,
          description: true,
          altText: true,
          ctaText: true,
          asset: {
            select: publicFileAssetSelect,
          },
        },
      },
    },
  },
} satisfies Prisma.AdCampaignAssignmentSelect;

export type PublicAdCandidate = Prisma.AdCampaignAssignmentGetPayload<{
  select: typeof publicAdCandidateSelect;
}>;

interface PublicAdSlotRecord {
  code: string;
  placement: PublicAdDeliveryResponseDto["slot"]["placement"];
}

export function hasAvailablePublicAdTarget(
  candidate: PublicAdCandidate,
): boolean {
  const campaign = candidate.campaign;

  if (campaign.targetType === AdTargetType.NONE) {
    return true;
  }

  if (campaign.targetType === AdTargetType.URL) {
    return campaign.targetUrl !== null;
  }

  if (campaign.targetType === AdTargetType.STORE) {
    return (
      campaign.tenantId !== null &&
      campaign.targetStore !== null &&
      campaign.targetStore.tenantId === campaign.tenantId
    );
  }

  return (
    campaign.tenantId !== null &&
    campaign.targetPromotion !== null &&
    campaign.targetPromotion.tenantId === campaign.tenantId &&
    hasConsistentPublicPromotionTenant(campaign.targetPromotion)
  );
}

export function toPublicAdDeliveryResponse(
  slot: PublicAdSlotRecord,
  candidate: PublicAdCandidate | null,
): PublicAdDeliveryResponseDto {
  const creative = candidate?.campaign.creatives[0];

  if (!candidate || !creative?.asset) {
    return {
      slot,
      ad: null,
    };
  }

  const campaign = candidate.campaign;

  return {
    slot,
    ad: {
      campaignId: campaign.id,
      creative: {
        id: creative.id,
        title: creative.title,
        description: creative.description,
        altText: creative.altText,
        ctaText: creative.ctaText,
        asset: toPublicFileAssetResponse(creative.asset),
      },
      target: {
        type: campaign.targetType,
        store:
          campaign.targetType === AdTargetType.STORE && campaign.targetStore
            ? {
                id: campaign.targetStore.id,
                slug: campaign.targetStore.slug,
                name: campaign.targetStore.name,
              }
            : null,
        promotion:
          campaign.targetType === AdTargetType.PROMOTION &&
          campaign.targetPromotion
            ? {
                id: campaign.targetPromotion.id,
                slug: campaign.targetPromotion.slug,
                title: campaign.targetPromotion.title,
              }
            : null,
        url:
          campaign.targetType === AdTargetType.URL ? campaign.targetUrl : null,
      },
    },
  };
}
