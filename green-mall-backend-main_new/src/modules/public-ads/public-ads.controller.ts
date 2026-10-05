import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { PublicAdDeliveryResponseDto } from "./dto/public-ad-response.dto";
import { PublicAdsService } from "./public-ads.service";

@ApiTags("public/ads")
@Controller("public/ads")
export class PublicAdsController {
  constructor(private readonly publicAdsService: PublicAdsService) {}

  @Get("slots/:slotCode")
  @ApiOperation({
    summary: "Deliver one deterministic public advertisement for a slot",
    description:
      "Public endpoint; JWT is not required. Only active, non-deleted Assignments, Campaigns and Creatives with an active IMAGE FileAsset are eligible. Selects the highest-priority eligible Campaign assigned to the active Slot, then its first eligible Creative by sortOrder. Campaign startsAt is inclusive and endsAt is exclusive. A global lifetime impressionLimit is enforced as an event-based soft cap using persisted AD_IMPRESSION events: an exhausted Campaign is skipped in favor of the next deterministic candidate. Returns ad=null when the Slot exists but no eligible advertisement is available. Delivery itself does not create or reserve an impression. Concurrency overshoot remains possible, and random or weighted rotation is not implemented.",
  })
  @ApiParam({
    name: "slotCode",
    description: "Stable lowercase kebab-case AdSlot code, not its id.",
    example: "main-panel-home",
  })
  @ApiOkResponse({
    type: PublicAdDeliveryResponseDto,
    description:
      "Selected advertisement, or the same Slot projection with ad=null when no Assignment/Campaign/Creative is currently eligible.",
  })
  @ApiNotFoundResponse({
    description: "Ad slot is missing, inactive or soft-deleted.",
  })
  deliver(
    @Param("slotCode") slotCode: string,
  ): Promise<PublicAdDeliveryResponseDto> {
    return this.publicAdsService.deliverBySlotCode(slotCode);
  }
}
