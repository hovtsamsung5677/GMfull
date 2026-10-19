import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AnalyticsSource } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export enum AdAnalyticsGroupBy {
  CAMPAIGN = "campaign",
  CREATIVE = "creative",
  SLOT = "slot",
  PANEL = "panel",
}

export const AD_ANALYTICS_SOURCES = [
  AnalyticsSource.PANEL,
  AnalyticsSource.MOBILE,
] as const;

const ISO_DATE_TIME_WITH_TIME_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class AdAnalyticsQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description:
      "Inclusive start of the UTC-normalized event period. Must be an ISO 8601 date-time with a timezone.",
    example: "2026-08-01T00:00:00.000Z",
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(ISO_DATE_TIME_WITH_TIME_ZONE, {
    message: "from must be an ISO 8601 date-time with a timezone",
  })
  from?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description:
      "Exclusive end of the UTC-normalized event period. Must be later than from when both are supplied.",
    example: "2026-09-01T00:00:00.000Z",
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(ISO_DATE_TIME_WITH_TIME_ZONE, {
    message: "to must be an ISO 8601 date-time with a timezone",
  })
  to?: string;

  @ApiPropertyOptional({ maxLength: 191 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  campaignId?: string;

  @ApiPropertyOptional({ maxLength: 191 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  creativeId?: string;

  @ApiPropertyOptional({ maxLength: 191 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  adSlotId?: string;

  @ApiPropertyOptional({ maxLength: 191 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  panelId?: string;

  @ApiPropertyOptional({
    enum: AD_ANALYTICS_SOURCES,
    description:
      "Optional advertising event source. Only PANEL and MOBILE are accepted.",
  })
  @IsOptional()
  @IsIn(AD_ANALYTICS_SOURCES)
  source?: AnalyticsSource;
}

export class AdAnalyticsBreakdownQueryDto extends AdAnalyticsQueryDto {
  @ApiProperty({
    enum: AdAnalyticsGroupBy,
    enumName: "AdAnalyticsGroupBy",
    description: "Entity dimension used to group advertising events.",
  })
  @Transform(trimString)
  @IsEnum(AdAnalyticsGroupBy)
  groupBy!: AdAnalyticsGroupBy;
}
