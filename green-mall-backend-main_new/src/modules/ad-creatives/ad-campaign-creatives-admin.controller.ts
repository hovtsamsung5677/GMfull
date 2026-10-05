import {
  Body,
  Controller,
  Get,
  Param,
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
import { AdCreativesService } from "./ad-creatives.service";
import {
  AdCreativeAdminListResponseDto,
  AdCreativeAdminResponseDto,
} from "./dto/ad-creative-admin-response.dto";
import { AdCreativeQueryDto } from "./dto/ad-creative-query.dto";
import { CreateAdCreativeDto } from "./dto/create-ad-creative.dto";

const AD_CREATIVE_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "MALL_ADMIN",
  "ADS_MANAGER",
  "CONTENT_MANAGER",
];

@ApiTags("admin/ad-creatives")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description:
    "Allowed roles: SUPER_ADMIN, MALL_ADMIN, ADS_MANAGER and CONTENT_MANAGER.",
})
@Controller("admin/ad-campaigns/:campaignId/creatives")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AD_CREATIVE_ADMIN_ROLES)
export class AdCampaignCreativesAdminController {
  constructor(private readonly adCreativesService: AdCreativesService) {}

  @Get()
  @ApiOperation({
    summary: "List advertising creatives for a campaign",
    description:
      "Returns only non-deleted creatives for a non-deleted campaign. Supports text search, publication state, FileAsset filtering and pagination. Results are ordered by sortOrder ascending, createdAt descending and id ascending.",
  })
  @ApiParam({
    name: "campaignId",
    description: "Non-deleted AdCampaign cuid.",
  })
  @ApiOkResponse({ type: AdCreativeAdminListResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid boolean or pagination query parameter.",
  })
  @ApiNotFoundResponse({
    description: "Campaign does not exist or has been soft-deleted.",
  })
  findAll(
    @Param("campaignId") campaignId: string,
    @Query() query: AdCreativeQueryDto,
  ): Promise<AdCreativeAdminListResponseDto> {
    return this.adCreativesService.findAll(campaignId, query);
  }

  @Post()
  @ApiOperation({
    summary: "Create an advertising creative for a campaign",
    description:
      "Registers creative metadata for an existing FileAsset; this endpoint does not upload files. The campaign id comes only from the URL. Active creatives require an active IMAGE asset. Inactive drafts may omit the asset or use an inactive IMAGE asset. Campaign publication state does not prevent draft preparation.",
  })
  @ApiParam({
    name: "campaignId",
    description: "Non-deleted AdCampaign cuid.",
  })
  @ApiCreatedResponse({ type: AdCreativeAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid DTO, sort order, missing asset for an active creative or non-IMAGE asset.",
  })
  @ApiNotFoundResponse({
    description:
      "Campaign does not exist, campaign is soft-deleted, or FileAsset was not found.",
  })
  @ApiConflictResponse({
    description: "An active creative references an inactive FileAsset.",
  })
  create(
    @Param("campaignId") campaignId: string,
    @Body() dto: CreateAdCreativeDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdCreativeAdminResponseDto> {
    return this.adCreativesService.create(campaignId, dto, userId);
  }
}
