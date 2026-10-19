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
import { CreatePublicAdEventDto } from "./dto/create-public-ad-event.dto";
import { PublicAdEventResponseDto } from "./dto/public-ad-event-response.dto";
import { PublicAdEventsService } from "./public-ad-events.service";

@ApiTags("public/ads")
@Controller("public/ads")
export class PublicAdEventsController {
  constructor(private readonly publicAdEventsService: PublicAdEventsService) {}

  @Post("events")
  @ApiOperation({
    summary: "Track a public advertising impression or click",
    description:
      "Public ingestion endpoint; JWT is not required. Accepts only AD_IMPRESSION or AD_CLICK from PANEL or MOBILE. PANEL requires panelId, and a panel-bound Slot requires the matching Panel. clientEventId makes identical retries idempotent: a new event returns 201, while an identical replay returns 200 with the original acknowledgement. Reusing the key for a different event identity returns 409. Tracking validates structural Campaign/Creative/Slot/Assignment relationships but intentionally does not re-run current delivery lifecycle eligibility.",
  })
  @ApiBody({ type: CreatePublicAdEventDto })
  @ApiCreatedResponse({
    type: PublicAdEventResponseDto,
    description: "A new AnalyticsEvent was recorded.",
  })
  @ApiOkResponse({
    type: PublicAdEventResponseDto,
    description:
      "An identical clientEventId replay returned the existing AnalyticsEvent.",
  })
  @ApiBadRequestResponse({
    description:
      "DTO validation failed, PANEL has no panelId, Creative belongs to another Campaign, or Panel does not match the panel-bound Slot.",
  })
  @ApiNotFoundResponse({
    description:
      "AdSlot, AdCampaign, AdCreative, AdCampaignAssignment or Panel was not found.",
  })
  @ApiConflictResponse({
    description:
      "clientEventId is already associated with a different advertising event identity.",
  })
  async track(
    @Body() dto: CreatePublicAdEventDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAdEventResponseDto> {
    const result = await this.publicAdEventsService.track(dto);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.event;
  }
}
