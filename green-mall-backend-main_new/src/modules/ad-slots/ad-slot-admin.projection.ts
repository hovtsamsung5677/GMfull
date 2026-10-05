import { Prisma } from "@prisma/client";
import { AdSlotAdminResponseDto } from "./dto/ad-slot-admin-response.dto";

export const adSlotAdminInclude = {
  panel: {
    select: {
      id: true,
      code: true,
      name: true,
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
} satisfies Prisma.AdSlotInclude;

export type AdSlotAdminRecord = Prisma.AdSlotGetPayload<{
  include: typeof adSlotAdminInclude;
}>;

export function toAdSlotAdminResponse(
  slot: AdSlotAdminRecord,
): AdSlotAdminResponseDto {
  return {
    id: slot.id,
    code: slot.code,
    name: slot.name,
    description: slot.description,
    placement: slot.placement,
    panelId: slot.panelId,
    sortOrder: slot.sortOrder,
    isActive: slot.isActive,
    metadata: slot.metadata,
    deletedAt: slot.deletedAt,
    createdById: slot.createdById,
    updatedById: slot.updatedById,
    panel: slot.panel,
    createdBy: slot.createdBy,
    updatedBy: slot.updatedBy,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}
