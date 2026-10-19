import { Prisma } from "@prisma/client";
import { AdCreativeAdminResponseDto } from "./dto/ad-creative-admin-response.dto";

export const adCreativeAdminInclude = {
  campaign: {
    select: {
      id: true,
      name: true,
      placement: true,
      targetType: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
    },
  },
  asset: {
    select: {
      id: true,
      filename: true,
      originalName: true,
      url: true,
      mimeType: true,
      kind: true,
      isActive: true,
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
} satisfies Prisma.AdCreativeInclude;

export type AdCreativeAdminRecord = Prisma.AdCreativeGetPayload<{
  include: typeof adCreativeAdminInclude;
}>;

export function toAdCreativeAdminResponse(
  creative: AdCreativeAdminRecord,
): AdCreativeAdminResponseDto {
  return {
    id: creative.id,
    campaignId: creative.campaignId,
    assetId: creative.assetId,
    title: creative.title,
    description: creative.description,
    altText: creative.altText,
    ctaText: creative.ctaText,
    isActive: creative.isActive,
    sortOrder: creative.sortOrder,
    metadata: creative.metadata,
    deletedAt: creative.deletedAt,
    createdById: creative.createdById,
    updatedById: creative.updatedById,
    campaign: creative.campaign,
    asset: creative.asset,
    createdBy: creative.createdBy,
    updatedBy: creative.updatedBy,
    createdAt: creative.createdAt,
    updatedAt: creative.updatedAt,
  };
}
