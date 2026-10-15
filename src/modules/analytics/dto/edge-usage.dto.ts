import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EdgeUsageRollupDto {
  @ApiProperty({ description: "RouteEdge id." })
  edgeId!: string;

  @ApiProperty({ description: "Request count within the rolling window." })
  count!: number;
}

export class EdgeUsageResponseDto {
  @ApiProperty({ description: "Rolling window duration in milliseconds." })
  windowMs!: number;

  @ApiProperty({ description: "Generated at server time." })
  generatedAt!: string;

  @ApiProperty({ type: [EdgeUsageRollupDto] })
  edges!: EdgeUsageRollupDto[];
}

export class AnalyticsRouteBuiltQueryDto {
  @ApiPropertyOptional({ description: "Filter by floor id." })
  limit?: number;
}