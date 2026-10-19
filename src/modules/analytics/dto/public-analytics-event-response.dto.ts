import { ApiProperty } from "@nestjs/swagger";
import { AnalyticsEventType } from "@prisma/client";
import { PUBLIC_ANALYTICS_EVENT_TYPES } from "./create-public-analytics-event.dto";

export class PublicAnalyticsEventResponseDto {
  @ApiProperty({ description: "Server-generated AnalyticsEvent identifier." })
  id!: string;

  @ApiProperty({ description: "Client-generated idempotency key." })
  clientEventId!: string;

  @ApiProperty({ enum: PUBLIC_ANALYTICS_EVENT_TYPES })
  type!: AnalyticsEventType;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
