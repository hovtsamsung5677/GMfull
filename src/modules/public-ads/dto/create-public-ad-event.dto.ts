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

export const PUBLIC_AD_EVENT_TYPES = [
  AnalyticsEventType.AD_IMPRESSION,
  AnalyticsEventType.AD_CLICK,
] as const;

export const PUBLIC_AD_EVENT_SOURCES = [
  AnalyticsSource.PANEL,
  AnalyticsSource.MOBILE,
] as const;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreatePublicAdEventDto {
  @ApiProperty({
    example: "0192f744-5d91-7a31-a2e1-8c03fce58f61",
    maxLength: 128,
    description:
      "Client-generated idempotency key. Reuse is successful only for the same advertising event identity.",
  })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  clientEventId!: string;

  @ApiProperty({
    enum: PUBLIC_AD_EVENT_TYPES,
    example: AnalyticsEventType.AD_IMPRESSION,
    description:
      "Only AD_IMPRESSION and AD_CLICK are accepted by this public endpoint.",
  })
  @IsIn(PUBLIC_AD_EVENT_TYPES)
  type!: AnalyticsEventType;

  @ApiProperty({
    example: "main-panel-home",
    maxLength: 100,
    description:
      "Stable AdSlot code. It is trimmed and normalized to lowercase by the backend.",
  })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slotCode!: string;

  @ApiProperty({ example: "cmr-ad-campaign-id", maxLength: 191 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  campaignId!: string;

  @ApiProperty({ example: "cmr-ad-creative-id", maxLength: 191 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  creativeId!: string;

  @ApiProperty({
    enum: PUBLIC_AD_EVENT_SOURCES,
    example: AnalyticsSource.PANEL,
    description: "ADMIN and all other sources are rejected.",
  })
  @IsIn(PUBLIC_AD_EVENT_SOURCES)
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
      "Required for source=PANEL. Optional for MOBILE. For a panel-bound Slot, a PANEL event must use that same Panel.",
  })
  @Transform(trimString)
  @ValidateIf(
    (dto: CreatePublicAdEventDto, value: unknown) =>
      dto.source === AnalyticsSource.PANEL ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  panelId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      "Optional client device context. It is stored as event data and is not part of the idempotency identity.",
  })
  @IsOptional()
  @IsObject()
  deviceData?: Record<string, unknown> | null;
}
