import { RouteEdgeType, RouteNodeType } from "@prisma/client";

export const VERTICAL_ROUTE_EDGE_TYPES = [
  RouteEdgeType.ELEVATOR,
  RouteEdgeType.ESCALATOR,
  RouteEdgeType.STAIRS,
] as const;

export interface RouteEdgeInvariantState {
  type: RouteEdgeType;
  floorId: string | null;
  fromNodeId: string;
  toNodeId: string;
}

export interface RouteEdgeEndpointState {
  id: string;
  floorId: string;
  type: RouteNodeType;
}

export function isVerticalRouteEdgeType(
  type: RouteEdgeType,
): type is (typeof VERTICAL_ROUTE_EDGE_TYPES)[number] {
  return VERTICAL_ROUTE_EDGE_TYPES.includes(
    type as (typeof VERTICAL_ROUTE_EDGE_TYPES)[number],
  );
}

export function getRouteEdgeInvariantViolation(
  edge: RouteEdgeInvariantState,
  fromNode: RouteEdgeEndpointState,
  toNode: RouteEdgeEndpointState,
): string | null {
  if (edge.fromNodeId === edge.toNodeId || fromNode.id === toNode.id) {
    return "Route edge must connect two different route nodes";
  }

  if (edge.type === RouteEdgeType.WALKWAY) {
    if (edge.floorId === null) {
      return "WALKWAY route edge requires floorId";
    }

    if (fromNode.floorId !== toNode.floorId) {
      return "WALKWAY route edge nodes must belong to the same floor";
    }

    if (fromNode.floorId !== edge.floorId || toNode.floorId !== edge.floorId) {
      return "WALKWAY route edge floorId must match both route nodes";
    }

    return null;
  }

  if (edge.floorId !== null) {
    return `${edge.type} route edge requires floorId to be null`;
  }

  if (fromNode.floorId === toNode.floorId) {
    return `${edge.type} route edge nodes must belong to different floors`;
  }

  const requiredNodeType = RouteNodeType[edge.type];

  if (fromNode.type !== requiredNodeType || toNode.type !== requiredNodeType) {
    return `${edge.type} route edge requires both route nodes to have type ${requiredNodeType}`;
  }

  return null;
}
