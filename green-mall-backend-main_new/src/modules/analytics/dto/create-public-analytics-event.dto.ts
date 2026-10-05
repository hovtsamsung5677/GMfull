import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AnalyticsEventType, AnalyticsSource } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export const PUBLIC_ANALYTICS_EVENT_TYPES = [
  AnalyticsEventType.SESSION_STARTED,
  AnalyticsEventType.SESSION_ENDED,
  AnalyticsEventType.SESSION_RESET,
  AnalyticsEventType.SEARCH_QUERY,
  AnalyticsEventType.CATEGORY_SELECTED,
  AnalyticsEventType.STORE_SELECTED,
  AnalyticsEventType.STORE_CARD_VIEWED,
  AnalyticsEventType.ROUTE_BUILT,
  AnalyticsEventType.PROMOTION_VIEWED,
  AnalyticsEventType.MOBILE_OPENED,
  AnalyticsEventType.PANEL_USED,
  AnalyticsEventType.DATA_LOAD_ERROR,
] as const;

export const PUBLIC_ANALYTICS_EVENT_SOURCES = [
  AnalyticsSource.PANEL,
  AnalyticsSource.MOBILE,
] as const;

const STORE_EVENT_TYPES: readonly AnalyticsEventType[] = [
  AnalyticsEventType.STORE_SELECTED,
  AnalyticsEventType.STORE_CARD_VIEWED,
];

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreatePublicAnalyticsEventDto {
  @ApiProperty({
    example: "0192f744-5d91-7a31-a2e1-8c03fce58f61",
    maxLength: 128,
    description:
      "Required client-generated idempotency key. Reusing it is successful only for the same visitor/navigation event identity.",
  })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientEventId!: string;

  @ApiProperty({
    enum: PUBLIC_ANALYTICS_EVENT_TYPES,
    example: AnalyticsEventType.SEARCH_QUERY,
    description:
      "Visitor/navigation event type accepted by this endpoint. AD_IMPRESSION, AD_CLICK and QR_SCANNED are rejected.",
  })
  @IsIn(PUBLIC_ANALYTICS_EVENT_TYPES)
  type!: AnalyticsEventType;

  @ApiProperty({
    enum: PUBLIC_ANALYTICS_EVENT_SOURCES,
    example: AnalyticsSource.MOBILE,
    description: "Only PANEL and MOBILE are accepted; ADMIN is rejected.",
  })
  @IsIn(PUBLIC_ANALYTICS_EVENT_SOURCES)
  source!: AnalyticsSource;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 191,
    description: "Optional client session identifier.",
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  sessionId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 191,
    description:
      "Required for source=PANEL. If supplied for MOBILE, the referenced Panel must also exist.",
  })
  @Transform(trimString)
  @ValidateIf(
    (dto: CreatePublicAnalyticsEventDto, value: unknown) =>
      dto.source === AnalyticsSource.PANEL ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  panelId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 191,
    description:
      "Required for STORE_SELECTED and STORE_CARD_VIEWED. Any supplied Store must exist.",
  })
  @Transform(trimString)
  @ValidateIf(
    (dto: CreatePublicAnalyticsEventDto, value: unknown) =>
      STORE_EVENT_TYPES.includes(dto.type) ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  storeId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 191,
    description:
      "Required for CATEGORY_SELECTED. Any supplied Category must exist.",
  })
  @Transform(trimString)
  @ValidateIf(
    (dto: CreatePublicAnalyticsEventDto, value: unknown) =>
      dto.type === AnalyticsEventType.CATEGORY_SELECTED ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  categoryId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 191,
    description:
      "Required for PROMOTION_VIEWED. Any supplied Promotion must exist.",
  })
  @Transform(trimString)
  @ValidateIf(
    (dto: CreatePublicAnalyticsEventDto, value: unknown) =>
      dto.type === AnalyticsEventType.PROMOTION_VIEWED ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  promotionId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 500,
    description:
      "Required and non-empty for SEARCH_QUERY. It is trimmed before persistence.",
  })
  @Transform(trimString)
  @ValidateIf(
    (dto: CreatePublicAnalyticsEventDto, value: unknown) =>
      dto.type === AnalyticsEventType.SEARCH_QUERY ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  query?: string | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      "Optional client device context. It is stored but is not part of the idempotency identity.",
  })
  @IsOptional()
  @IsObject()
  deviceData?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      "Optional event payload, including existing ROUTE_BUILT or DATA_LOAD_ERROR details. It is part of the idempotency identity.",
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown> | null;
}
