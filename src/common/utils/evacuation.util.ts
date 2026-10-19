import { RouteNodeType } from '@prisma/client';

/**
 * Ключ в `metadata` узла маршрута. Узел типа STAIRS с этим флагом считается
 * пожарной (эвакуационной) лестницей: она показывается на карте маркером и
 * служит целью эвакуационного маршрута после прибытия в магазин.
 */
export const EVACUATION_STAIRS_METADATA_KEY = 'isEvacuation';

type EvacuationStairCandidate = {
  type: RouteNodeType | string;
  metadata: unknown;
};

export function isEvacuationStairNode(node: EvacuationStairCandidate): boolean {
  if (node.type !== RouteNodeType.STAIRS) {
    return false;
  }

  const { metadata } = node;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }

  return Boolean(
    (metadata as Record<string, unknown>)[EVACUATION_STAIRS_METADATA_KEY],
  );
}
