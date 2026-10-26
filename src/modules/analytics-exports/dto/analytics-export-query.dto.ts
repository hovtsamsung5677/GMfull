import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsOptional, IsString, Min } from "class-validator";
import { NavigationAnalyticsQueryDto } from "../../analytics/dto/navigation-analytics-query.dto";
import {
  AdAnalyticsQueryDto,
  AdAnalyticsGroupBy,
} from "../../analytics/dto/ad-analytics-query.dto";

export enum AnalyticsExportFormat {
  CSV = "csv",
  XLSX = "xlsx",
}

export class AnalyticsExportFormatQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsExportFormat,
    description: "Output format. Defaults to csv.",
    default: AnalyticsExportFormat.CSV,
    example: AnalyticsExportFormat.XLSX,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsOptional()
  @IsEnum(AnalyticsExportFormat)
  format?: AnalyticsExportFormat;
}

export class AnalyticsExportNavigationQueryDto extends NavigationAnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsExportFormat,
    description: "Output format. Defaults to csv.",
    default: AnalyticsExportFormat.CSV,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsOptional()
  @IsEnum(AnalyticsExportFormat)
  format?: AnalyticsExportFormat;
}

export class AnalyticsExportAdsBreakdownQueryDto extends AdAnalyticsQueryDto {
  @ApiProperty({
    enum: AdAnalyticsGroupBy,
    description:
      "Entity dimension used to group advertising events for export.",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsString()
  @IsIn(Object.values(AdAnalyticsGroupBy))
  groupBy!: AdAnalyticsGroupBy;

  @ApiPropertyOptional({
    enum: AnalyticsExportFormat,
    description: "Output format. Defaults to csv.",
    default: AnalyticsExportFormat.CSV,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsOptional()
  @IsEnum(AnalyticsExportFormat)
  format?: AnalyticsExportFormat;
}

export type ExportFormat = AnalyticsExportFormat;
