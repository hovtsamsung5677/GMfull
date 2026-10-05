import { Prisma } from "@prisma/client";
import { PublicAnalyticsEventResponseDto } from "./dto/public-analytics-event-response.dto";

export const publicAnalyticsEventIdentitySelect = {
  id: true,
  clientEventId: true,
  type: true,
  source: true,
  sessionId: true,
  panelId: true,
  storeId: true,
  categoryId: true,
  promotionId: true,
  query: true,
  payload: true,
  createdAt: true,
} satisfies Prisma.AnalyticsEventSelect;

export type PublicAnalyticsEventIdentityRecord =
  Prisma.AnalyticsEventGetPayload<{
    select: typeof publicAnalyticsEventIdentitySelect;
  }>;

export function toPublicAnalyticsEventResponse(
  event: PublicAnalyticsEventIdentityRecord,
): PublicAnalyticsEventResponseDto {
  return {
    id: event.id,
    clientEventId: event.clientEventId!,
    type: event.type,
    createdAt: event.createdAt,
  };
}
