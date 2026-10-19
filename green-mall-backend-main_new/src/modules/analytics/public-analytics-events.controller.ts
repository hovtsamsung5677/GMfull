import { Body, Controller, HttpStatus, Post, Res } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { CreatePublicAnalyticsEventDto } from "./dto/create-public-analytics-event.dto";
import { PublicAnalyticsEventResponseDto } from "./dto/public-analytics-event-response.dto";
import { PublicAnalyticsEventsService } from "./public-analytics-events.service";

@ApiTags("public/analytics")
@Controller("public/analytics")
export class PublicAnalyticsEventsController {
  constructor(
    private readonly publicAnalyticsEventsService: PublicAnalyticsEventsService,
  ) {}

  @Post("events")
  @ApiOperation({
    summary: "Track a public visitor or navigation analytics event",
    description:
      "Public ingestion endpoint; JWT is not required. Accepts the documented visitor/navigation types from PANEL or MOBILE, but rejects AD_IMPRESSION, AD_CLICK and ADMIN. PANEL requires panelId. clientEventId provides race-safe idempotency: a new event returns 201, an identical replay returns 200, and reuse for another identity returns 409. Identity includes type, source, session, subject references, qrToken, query and payload; deviceData is contextual only. Referenced entities are checked for existence without current lifecycle filtering. This endpoint does not update Panel runtime fields or implement heartbeat.",
  })
  @ApiBody({ type: CreatePublicAnalyticsEventDto })
  @ApiCreatedResponse({
    type: PublicAnalyticsEventResponseDto,
    description: "A new AnalyticsEvent was recorded.",
  })
  @ApiOkResponse({
    type: PublicAnalyticsEventResponseDto,
    description:
      "An identical clientEventId replay returned the original AnalyticsEvent acknowledgement.",
  })
  @ApiBadRequestResponse({
    description:
      "DTO validation failed, the event type/source is unsupported, or an event-specific required field/source is invalid.",
  })
  @ApiNotFoundResponse({
    description:
      "A supplied Panel, Store, Category or Promotion reference was not found.",
  })
  @ApiConflictResponse({
    description:
      "clientEventId is already associated with a different visitor/navigation event identity.",
  })
  async track(
    @Body() dto: CreatePublicAnalyticsEventDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAnalyticsEventResponseDto> {
    const result = await this.publicAnalyticsEventsService.track(dto);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.event;
  }
}
