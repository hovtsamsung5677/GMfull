import { Prisma } from "@prisma/client";
import { PublicFileAssetResponseDto } from "./dto/public-file-asset-response.dto";

export const publicFileAssetSelect = {
  id: true,
  filename: true,
  originalName: true,
  url: true,
  mimeType: true,
  size: true,
  provider: true,
  kind: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
} satisfies Prisma.FileAssetSelect;

export type PublicFileAssetRecord = Prisma.FileAssetGetPayload<{
  select: typeof publicFileAssetSelect;
}>;

export function toPublicFileAssetResponse(
  asset: PublicFileAssetRecord,
): PublicFileAssetResponseDto {
  return {
    id: asset.id,
    filename: asset.filename,
    originalName: asset.originalName,
    url: asset.url,
    mimeType: asset.mimeType,
    size: asset.size,
    provider: asset.provider,
    kind: asset.kind,
    metadata: asset.metadata,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export function toActivePublicFileAssetResponse(
  asset: PublicFileAssetRecord | null,
): PublicFileAssetResponseDto | null {
  return asset?.isActive ? toPublicFileAssetResponse(asset) : null;
}
