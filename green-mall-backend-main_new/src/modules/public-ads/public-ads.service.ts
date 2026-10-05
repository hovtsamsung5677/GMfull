import { Injectable, NotFoundException } from "@nestjs/common";
import { AdTargetType, AnalyticsEventType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { normalizeAdSlotCode } from "../ad-slots/ad-slot-code";
import { buildPublicPromotionWhere } from "../promotions/promotion-public.eligibility";
import { PublicAdDeliveryResponseDto } from "./dto/public-ad-response.dto";
import {
  hasAvailablePublicAdTarget,
  publicAdCandidateSelect,
  PublicAdCandidate,
  publicAdCreativeWhere,
  toPublicAdDeliveryResponse,
} from "./public-ad.projection";

@Injectable()
export class PublicAdsService {
  constructor(private readonly prisma: PrismaService) {}

  async deliverBySlotCode(
    slotCode: string,
  ): Promise<PublicAdDeliveryResponseDto> {
    const slot = await this.prisma.adSlot.findFirst({
      where: {
        code: normalizeAdSlotCode(slotCode),
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        placement: true,
      },
    });

    if (!slot) {
      throw new NotFoundException("Ad slot not found");
    }

    const now = new Date();
    const candidates = await this.prisma.adCampaignAssignment.findMany({
      where: {
        slotId: slot.id,
        isActive: true,
        deletedAt: null,
        campaign: {
          is: {
            isActive: true,
            deletedAt: null,
            placement: slot.placement,
            creatives: {
              some: publicAdCreativeWhere,
            },
            AND: [
              {
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
              },
              {
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
              },
              {
                OR: [
                  { targetType: AdTargetType.NONE },
                  { targetType: AdTargetType.URL },
                  {
                    targetType: AdTargetType.STORE,
                    targetStore: {
                      is: {
                        isActive: true,
                        isVisible: true,
                        tenant: {
                          is: {
                            isActive: true,
                          },
                        },
                      },
                    },
                  },
                  {
                    targetType: AdTargetType.PROMOTION,
                    targetPromotion: {
                      is: buildPublicPromotionWhere(now),
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      orderBy: [
        { campaign: { priority: "desc" } },
        { campaign: { createdAt: "desc" } },
        { campaign: { id: "asc" } },
      ],
      select: publicAdCandidateSelect,
    });

    const targetEligibleCandidates = candidates.filter(
      hasAvailablePublicAdTarget,
    );
    const candidate = await this.findWithinImpressionLimit(
      targetEligibleCandidates,
    );

    return toPublicAdDeliveryResponse(
      { code: slot.code, placement: slot.placement },
      candidate,
    );
  }

  private async findWithinImpressionLimit(
    candidates: PublicAdCandidate[],
  ): Promise<PublicAdCandidate | null> {
    const limitedCampaignIds = [
      ...new Set(
        candidates
          .filter((candidate) => candidate.campaign.impressionLimit !== null)
          .map((candidate) => candidate.campaign.id),
      ),
    ];

    if (limitedCampaignIds.length === 0) {
      return candidates[0] ?? null;
    }

    const impressionCounts = await this.prisma.analyticsEvent.groupBy({
      by: ["campaignId"],
      where: {
        type: AnalyticsEventType.AD_IMPRESSION,
        campaignId: { in: limitedCampaignIds },
      },
      _count: { _all: true },
    });
    const impressionCountByCampaignId = new Map<string, number>();

    for (const row of impressionCounts) {
      if (row.campaignId !== null) {
        impressionCountByCampaignId.set(row.campaignId, row._count._all);
      }
    }

    return (
      candidates.find((candidate) => {
        const limit = candidate.campaign.impressionLimit;
        return (
          limit === null ||
          (impressionCountByCampaignId.get(candidate.campaign.id) ?? 0) < limit
        );
      }) ?? null
    );
  }
}
