import { FileAssetKind, Prisma } from "@prisma/client";
import { PublicPromotionResponseDto } from "./dto/public-promotion-response.dto";
import { hasConsistentPublicPromotionTenant } from "./promotion-public.eligibility";

export const publicPromotionSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  terms: true,
  buttonText: true,
  buttonUrl: true,
  startsAt: true,
  endsAt: true,
  sortOrder: true,
  tenantId: true,
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      roomNumber: true,
      tenantId: true,
    },
  },
  imageAsset: {
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      kind: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
    },
  },
} satisfies Prisma.PromotionSelect;

export type PublicPromotionRecord = Prisma.PromotionGetPayload<{
  select: typeof publicPromotionSelect;
}>;

export function toPublicPromotionResponse(
  promotion: PublicPromotionRecord,
): PublicPromotionResponseDto {
  const imageAsset =
    promotion.imageAsset?.isActive &&
    promotion.imageAsset.kind === FileAssetKind.IMAGE
      ? {
          id: promotion.imageAsset.id,
          filename: promotion.imageAsset.filename,
          originalName: promotion.imageAsset.originalName,
          mimeType: promotion.imageAsset.mimeType,
          size: promotion.imageAsset.size,
          url: promotion.imageAsset.url,
          kind: promotion.imageAsset.kind,
          metadata: promotion.imageAsset.metadata,
          createdAt: promotion.imageAsset.createdAt,
          updatedAt: promotion.imageAsset.updatedAt,
        }
      : null;

  return {
    id: promotion.id,
    slug: promotion.slug,
    title: promotion.title,
    description: promotion.description,
    terms: promotion.terms,
    buttonText: promotion.buttonText,
    buttonUrl: promotion.buttonUrl,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    sortOrder: promotion.sortOrder,
    store: {
      id: promotion.store!.id,
      name: promotion.store!.name,
      slug: promotion.store!.slug,
      roomNumber: promotion.store!.roomNumber,
    },
    imageAsset,
  };
}
