import { ApiProperty } from "@nestjs/swagger";
import { AnalyticsEventType } from "@prisma/client";
import { PUBLIC_AD_EVENT_TYPES } from "./create-public-ad-event.dto";

export class PublicAdEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientEventId!: string;

  @ApiProperty({ enum: PUBLIC_AD_EVENT_TYPES })
  type!: AnalyticsEventType;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
