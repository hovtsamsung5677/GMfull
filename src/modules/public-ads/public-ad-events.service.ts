import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnalyticsSource, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { normalizeAdSlotCode } from "../ad-slots/ad-slot-code";
import { CreatePublicAdEventDto } from "./dto/create-public-ad-event.dto";
import { PublicAdEventResponseDto } from "./dto/public-ad-event-response.dto";
import {
  PublicAdEventIdentityRecord,
  publicAdEventIdentitySelect,
  toPublicAdEventResponse,
} from "./public-ad-event.projection";

export interface PublicAdEventTrackingResult {
  event: PublicAdEventResponseDto;
  created: boolean;
}

@Injectable()
export class PublicAdEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(
    dto: CreatePublicAdEventDto,
  ): Promise<PublicAdEventTrackingResult> {
    const slotCode = normalizeAdSlotCode(dto.slotCode);
    const existing = await this.findByClientEventId(dto.clientEventId);

    if (existing) {
      return this.resolveReplay(existing, dto, slotCode);
    }

    const slot = await this.prisma.adSlot.findUnique({
      where: { code: slotCode },
      select: {
        id: true,
        panelId: true,
      },
    });

    if (!slot) {
      throw new NotFoundException("Ad slot not found");
    }

    const panelId = dto.panelId ?? null;
    const [campaign, creative, assignment, panel] = await Promise.all([
      this.prisma.adCampaign.findUnique({
        where: { id: dto.campaignId },
        select: { id: true },
      }),
      this.prisma.adCreative.findUnique({
        where: { id: dto.creativeId },
        select: { id: true, campaignId: true },
      }),
      this.prisma.adCampaignAssignment.findUnique({
        where: {
          campaignId_slotId: {
            campaignId: dto.campaignId,
            slotId: slot.id,
          },
        },
        select: { id: true },
      }),
      panelId === null
        ? Promise.resolve(null)
        : this.prisma.panel.findUnique({
            where: { id: panelId },
            select: { id: true },
          }),
    ]);

    if (!campaign) {
      throw new NotFoundException("Ad campaign not found");
    }

    if (!creative) {
      throw new NotFoundException("Ad creative not found");
    }

    if (creative.campaignId !== campaign.id) {
      throw new BadRequestException(
        "Ad creative does not belong to the specified campaign",
      );
    }

    if (!assignment) {
      throw new NotFoundException("Ad campaign assignment not found");
    }

    this.validatePanel(dto.source, panelId, slot.panelId, panel);

    try {
      const event = await this.prisma.analyticsEvent.create({
        data: {
          clientEventId: dto.clientEventId,
          type: dto.type,
          source: dto.source,
          sessionId: dto.sessionId ?? null,
          panelId,
          adSlotId: slot.id,
          campaignId: campaign.id,
          creativeId: creative.id,
          deviceData: this.toJsonInput(dto.deviceData),
        },
        select: publicAdEventIdentitySelect,
      });

      return {
        event: toPublicAdEventResponse(event),
        created: true,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await this.findByClientEventId(dto.clientEventId);

        if (concurrent) {
          return this.resolveReplay(concurrent, dto, slotCode);
        }
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new NotFoundException(
          "Referenced advertising entity no longer exists",
        );
      }

      throw error;
    }
  }

  private async findByClientEventId(
    clientEventId: string,
  ): Promise<PublicAdEventIdentityRecord | null> {
    return this.prisma.analyticsEvent.findUnique({
      where: { clientEventId },
      select: publicAdEventIdentitySelect,
    });
  }

  private resolveReplay(
    existing: PublicAdEventIdentityRecord,
    dto: CreatePublicAdEventDto,
    slotCode: string,
  ): PublicAdEventTrackingResult {
    const sameIdentity =
      existing.type === dto.type &&
      existing.source === dto.source &&
      existing.sessionId === (dto.sessionId ?? null) &&
      existing.panelId === (dto.panelId ?? null) &&
      existing.campaignId === dto.campaignId &&
      existing.creativeId === dto.creativeId &&
      existing.adSlot?.code === slotCode;

    if (!sameIdentity) {
      throw new ConflictException(
        "clientEventId is already used for a different advertising event",
      );
    }

    return {
      event: toPublicAdEventResponse(existing),
      created: false,
    };
  }

  private validatePanel(
    source: AnalyticsSource,
    panelId: string | null,
    slotPanelId: string | null,
    panel: { id: string } | null,
  ): void {
    if (source === AnalyticsSource.PANEL && panelId === null) {
      throw new BadRequestException("panelId is required for PANEL source");
    }

    if (panelId !== null && !panel) {
      throw new NotFoundException("Panel not found");
    }

    if (
      source === AnalyticsSource.PANEL &&
      slotPanelId !== null &&
      slotPanelId !== panelId
    ) {
      throw new BadRequestException("Panel does not match ad slot");
    }
  }

  private toJsonInput(
    value: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
