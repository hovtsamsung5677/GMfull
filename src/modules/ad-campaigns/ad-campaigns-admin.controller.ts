import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdCampaignsService } from "./ad-campaigns.service";
import {
  AdCampaignAdminListResponseDto,
  AdCampaignAdminResponseDto,
} from "./dto/ad-campaign-admin-response.dto";
import { AdCampaignQueryDto } from "./dto/ad-campaign-query.dto";
import { CreateAdCampaignDto } from "./dto/create-ad-campaign.dto";
import { UpdateAdCampaignDto } from "./dto/update-ad-campaign.dto";

const AD_CAMPAIGN_READ_ROLES = ["SUPER_ADMIN", "MALL_ADMIN", "ADS_MANAGER"];

const AD_CAMPAIGN_WRITE_ROLES = ["SUPER_ADMIN", "MALL_ADMIN", "ADS_MANAGER"];

@ApiTags("admin/ad-campaigns")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description: "The authenticated role is not allowed for this operation.",
})
@Controller("admin/ad-campaigns")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdCampaignsAdminController {
  constructor(private readonly adCampaignsService: AdCampaignsService) {}

  @Get()
  @Roles(...AD_CAMPAIGN_READ_ROLES)
  @ApiOperation({
    summary: "List advertising campaigns",
    description:
      "Returns non-deleted campaigns with pagination. Supports search, tenant, placement, target type, publication state and startsAt range filters. Read roles: SUPER_ADMIN, MALL_ADMIN, ADS_MANAGER.",
  })
  @ApiOkResponse({ type: AdCampaignAdminListResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid pagination, enum, boolean or date-range filter.",
  })
  findAll(
    @Query() query: AdCampaignQueryDto,
  ): Promise<AdCampaignAdminListResponseDto> {
    return this.adCampaignsService.findAll(query);
  }

  @Get(":id")
  @Roles(...AD_CAMPAIGN_READ_ROLES)
  @ApiOperation({
    summary: "Get one advertising campaign",
    description:
      "Returns a non-deleted campaign with safe tenant, target, audit-user summaries and non-deleted creative count. Read roles: SUPER_ADMIN, MALL_ADMIN, ADS_MANAGER.",
  })
  @ApiParam({ name: "id", description: "AdCampaign cuid." })
  @ApiOkResponse({ type: AdCampaignAdminResponseDto })
  @ApiNotFoundResponse({
    description: "Campaign does not exist or has been soft-deleted.",
  })
  findOne(@Param("id") id: string): Promise<AdCampaignAdminResponseDto> {
    return this.adCampaignsService.findOne(id);
  }

  @Post()
  @Roles(...AD_CAMPAIGN_WRITE_ROLES)
  @ApiOperation({
    summary: "Create an advertising campaign",
    description:
      "Creates a campaign and records createdById/updatedById from JWT. STORE, PROMOTION, URL and NONE targets have mutually exclusive fields. Write roles: SUPER_ADMIN, MALL_ADMIN, ADS_MANAGER.",
  })
  @ApiCreatedResponse({ type: AdCampaignAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid request DTO, target shape, HTTP(S) URL, date range, priority or impression limit.",
  })
  @ApiNotFoundResponse({
    description: "Referenced tenant, store or promotion was not found.",
  })
  @ApiConflictResponse({
    description:
      "Tenant ownership mismatch or an active campaign references an inactive dependency.",
  })
  create(
    @Body() dto: CreateAdCampaignDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdCampaignAdminResponseDto> {
    return this.adCampaignsService.create(dto, userId);
  }

  @Patch(":id")
  @Roles(...AD_CAMPAIGN_WRITE_ROLES)
  @ApiOperation({
    summary: "Partially update an advertising campaign",
    description:
      "Validates the complete merged campaign state, including reactivation, then records updatedById from JWT. Soft-deleted campaigns cannot be edited.",
  })
  @ApiParam({ name: "id", description: "AdCampaign cuid." })
  @ApiOkResponse({ type: AdCampaignAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid request DTO, final target shape, HTTP(S) URL, date range, priority or impression limit.",
  })
  @ApiNotFoundResponse({
    description:
      "Campaign is missing/soft-deleted or a referenced entity was not found.",
  })
  @ApiConflictResponse({
    description:
      "Tenant ownership mismatch, an active campaign references an inactive dependency, or the requested placement conflicts with a non-deleted slot assignment.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdCampaignDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdCampaignAdminResponseDto> {
    return this.adCampaignsService.update(id, dto, userId);
  }

  @Delete(":id")
  @Roles(...AD_CAMPAIGN_WRITE_ROLES)
  @ApiOperation({
    summary: "Soft-delete an advertising campaign",
    description:
      "Sets isActive=false, deletedAt to the current UTC timestamp and updatedById from JWT. The row is not physically deleted.",
  })
  @ApiParam({ name: "id", description: "AdCampaign cuid." })
  @ApiOkResponse({ type: AdCampaignAdminResponseDto })
  @ApiNotFoundResponse({
    description: "Campaign does not exist or is already soft-deleted.",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ): Promise<AdCampaignAdminResponseDto> {
    return this.adCampaignsService.remove(id, userId);
  }
}
