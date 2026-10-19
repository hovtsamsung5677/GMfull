import { ApiProperty } from "@nestjs/swagger";
import { AdPlacement } from "@prisma/client";
import { AdAnalyticsGroupBy } from "./ad-analytics-query.dto";

export class AdAnalyticsMetricsResponseDto {
  @ApiProperty({ minimum: 0, example: 120 })
  impressions!: number;

  @ApiProperty({ minimum: 0, example: 12 })
  clicks!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    example: 0.1,
    description:
      "Click-through ratio calculated as clicks / impressions. It is 0 when impressions are 0 and is intentionally not capped at 1.",
  })
  ctr!: number;
}

export class AdAnalyticsSummaryResponseDto extends AdAnalyticsMetricsResponseDto {}

export class AdAnalyticsEntityResponseDto {
  @ApiProperty({ description: "Identifier of the grouped entity." })
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Campaign, Slot or Panel name, or Creative title when available.",
  })
  name!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Stable code for Slot or Panel; null for other dimensions.",
  })
  code!: string | null;

  @ApiProperty({
    enum: AdPlacement,
    enumName: "AdPlacement",
    nullable: true,
    description: "Campaign or Slot placement when applicable.",
  })
  placement!: AdPlacement | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Parent Campaign id for a Creative; null otherwise.",
  })
  campaignId!: string | null;
}

export class AdAnalyticsBreakdownItemResponseDto extends AdAnalyticsMetricsResponseDto {
  @ApiProperty({ description: "Identifier used as the aggregation key." })
  entityId!: string;

  @ApiProperty({
    type: () => AdAnalyticsEntityResponseDto,
    nullable: true,
    description:
      "Safe concise entity projection. It can be null if the entity disappeared after aggregation.",
  })
  entity!: AdAnalyticsEntityResponseDto | null;
}

export class AdAnalyticsBreakdownResponseDto {
  @ApiProperty({
    enum: AdAnalyticsGroupBy,
    enumName: "AdAnalyticsGroupBy",
  })
  groupBy!: AdAnalyticsGroupBy;

  @ApiProperty({ type: [AdAnalyticsBreakdownItemResponseDto] })
  items!: AdAnalyticsBreakdownItemResponseDto[];
}
