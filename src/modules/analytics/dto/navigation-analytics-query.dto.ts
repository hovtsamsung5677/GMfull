import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AnalyticsSource } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export const NAVIGATION_ANALYTICS_SOURCES = [
  AnalyticsSource.PANEL,
  AnalyticsSource.MOBILE,
] as const;

const ISO_DATE_TIME_WITH_TIME_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class NavigationAnalyticsQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description:
      "Inclusive start of the UTC-normalized event period. Must be an ISO 8601 date-time with a timezone. Summary defaults to the complete history, daily and hourly series default to the last 30 days.",
    example: "2026-09-13T00:00:00.000Z",
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
    example: "2026-10-13T00:00:00.000Z",
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
  panelId?: string;

  @ApiPropertyOptional({
    enum: NAVIGATION_ANALYTICS_SOURCES,
    description:
      "Optional event source. Only PANEL and MOBILE are accepted.",
  })
  @IsOptional()
  @IsIn(NAVIGATION_ANALYTICS_SOURCES)
  source?: AnalyticsSource;
}
