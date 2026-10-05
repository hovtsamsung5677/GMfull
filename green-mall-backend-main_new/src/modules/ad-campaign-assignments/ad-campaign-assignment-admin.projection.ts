import { Prisma } from "@prisma/client";
import { AdCampaignAssignmentAdminResponseDto } from "./dto/ad-campaign-assignment-admin-response.dto";

export const adCampaignAssignmentAdminInclude = {
  campaign: {
    select: {
      id: true,
      name: true,
      placement: true,
      startsAt: true,
      endsAt: true,
      priority: true,
      impressionLimit: true,
      isActive: true,
      deletedAt: true,
    },
  },
  slot: {
    select: {
      id: true,
      code: true,
      name: true,
      placement: true,
      panelId: true,
      sortOrder: true,
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
} satisfies Prisma.AdCampaignAssignmentInclude;

export type AdCampaignAssignmentAdminRecord =
  Prisma.AdCampaignAssignmentGetPayload<{
    include: typeof adCampaignAssignmentAdminInclude;
  }>;

export function toAdCampaignAssignmentAdminResponse(
  assignment: AdCampaignAssignmentAdminRecord,
): AdCampaignAssignmentAdminResponseDto {
  return {
    id: assignment.id,
    campaignId: assignment.campaignId,
    slotId: assignment.slotId,
    isActive: assignment.isActive,
    deletedAt: assignment.deletedAt,
    createdById: assignment.createdById,
    updatedById: assignment.updatedById,
    campaign: assignment.campaign,
    slot: assignment.slot,
    createdBy: assignment.createdBy,
    updatedBy: assignment.updatedBy,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}
