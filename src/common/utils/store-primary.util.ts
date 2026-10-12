import { Prisma } from "@prisma/client";

export type StorePrimaryRelation = "mapObject" | "routeNode";

const metadataNamespace = "greenMall";
const relationKeys: Record<StorePrimaryRelation, string> = {
  mapObject: "primaryMapObjectForStoreId",
  routeNode: "primaryRouteNodeForStoreId",
};

function isJsonObject(
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isPrimaryStoreRelation(
  metadata: Prisma.JsonValue | null,
  relation: StorePrimaryRelation,
  storeId: string,
): boolean {
  if (!isJsonObject(metadata)) {
    return false;
  }

  const namespace = metadata[metadataNamespace];

  return (
    isJsonObject(namespace) && namespace[relationKeys[relation]] === storeId
  );
}

export function updatePrimaryStoreRelationMetadata(params: {
  metadata: Prisma.JsonValue | null;
  relation: StorePrimaryRelation;
  storeId: string;
  isPrimary: boolean;
}): Prisma.InputJsonValue | undefined {
  const { metadata, relation, storeId, isPrimary } = params;
  const relationKey = relationKeys[relation];
  const root: Record<string, Prisma.JsonValue> = isJsonObject(metadata)
    ? ({ ...metadata } as Record<string, Prisma.JsonValue>)
    : {};
  const currentNamespace = root[metadataNamespace];
  const namespace: Record<string, Prisma.JsonValue> = isJsonObject(
    currentNamespace,
  )
    ? ({ ...currentNamespace } as Record<string, Prisma.JsonValue>)
    : {};

  if (isPrimary) {
    if (namespace[relationKey] === storeId) {
      return undefined;
    }

    namespace[relationKey] = storeId;
  } else {
    if (namespace[relationKey] !== storeId) {
      return undefined;
    }

    delete namespace[relationKey];
  }

  if (Object.keys(namespace).length > 0) {
    root[metadataNamespace] = namespace;
  } else {
    delete root[metadataNamespace];
  }

  return root as Prisma.InputJsonObject;
}

export function preserveStorePrimaryRelationMetadata(
  currentMetadata: Prisma.JsonValue | null,
  nextMetadata: Record<string, unknown>,
): Prisma.InputJsonValue {
  if (!isJsonObject(currentMetadata)) {
    return nextMetadata as Prisma.InputJsonObject;
  }

  const currentNamespace = currentMetadata[metadataNamespace];

  if (!isJsonObject(currentNamespace)) {
    return nextMetadata as Prisma.InputJsonObject;
  }

  const nextRoot = { ...nextMetadata } as Record<string, Prisma.JsonValue>;
  const requestedNamespace = nextRoot[metadataNamespace];
  const nextNamespace: Record<string, Prisma.JsonValue> = isJsonObject(
    requestedNamespace,
  )
    ? ({ ...requestedNamespace } as Record<string, Prisma.JsonValue>)
    : {};

  for (const relationKey of Object.values(relationKeys)) {
    const value = currentNamespace[relationKey];

    if (value !== undefined) {
      nextNamespace[relationKey] = value;
    }
  }

  if (Object.keys(nextNamespace).length > 0) {
    nextRoot[metadataNamespace] = nextNamespace;
  }

  return nextRoot as Prisma.InputJsonObject;
}
