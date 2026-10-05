import { Prisma } from "@prisma/client";
import { PublicAdEventResponseDto } from "./dto/public-ad-event-response.dto";

export const publicAdEventIdentitySelect = {
  id: true,
  clientEventId: true,
  type: true,
  source: true,
  sessionId: true,
  panelId: true,
  adSlotId: true,
  campaignId: true,
  creativeId: true,
  createdAt: true,
  adSlot: {
    select: {
      code: true,
    },
  },
} satisfies Prisma.AnalyticsEventSelect;

export type PublicAdEventIdentityRecord = Prisma.AnalyticsEventGetPayload<{
  select: typeof publicAdEventIdentitySelect;
}>;

export function toPublicAdEventResponse(
  event: PublicAdEventIdentityRecord,
): PublicAdEventResponseDto {
  return {
    id: event.id,
    clientEventId: event.clientEventId!,
    type: event.type,
    createdAt: event.createdAt,
  };
}
