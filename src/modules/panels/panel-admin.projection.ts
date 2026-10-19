import { Prisma } from "@prisma/client";
import { PanelAdminResponseDto } from "./dto/panel-admin-response.dto";

export const panelAdminInclude = {
  floor: {
    select: {
      id: true,
      number: true,
      name: true,
      isActive: true,
    },
  },
  routeNode: {
    select: {
      id: true,
      floorId: true,
      type: true,
      name: true,
      code: true,
      x: true,
      y: true,
      z: true,
      isActive: true,
    },
  },
} satisfies Prisma.PanelInclude;

export type PanelAdminRecord = Prisma.PanelGetPayload<{
  include: typeof panelAdminInclude;
}>;

export function toPanelAdminResponse(
  panel: PanelAdminRecord,
): PanelAdminResponseDto {
  return {
    id: panel.id,
    code: panel.code,
    name: panel.name,
    description: panel.description,
    status: panel.status,
    floorId: panel.floorId,
    routeNodeId: panel.routeNodeId,
    location: panel.location,
    appVersion: panel.appVersion,
    lastSeenAt: panel.lastSeenAt,
    isActive: panel.isActive,
    floor: panel.floor,
    routeNode: panel.routeNode,
    createdAt: panel.createdAt,
    updatedAt: panel.updatedAt,
  };
}
