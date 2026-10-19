import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { AdCreativeAdminResponseDto } from "./dto/ad-creative-admin-response.dto";
import { UpdateAdCreativeDto } from "./dto/update-ad-creative.dto";

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
@Controller("admin/ad-creatives")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AD_CREATIVE_ADMIN_ROLES)
export class AdCreativesAdminController {
  constructor(private readonly adCreativesService: AdCreativesService) {}

  @Get(":id")
  @ApiOperation({
    summary: "Get one advertising creative",
    description:
      "Returns a non-deleted creative from a non-deleted campaign using a safe admin projection for Campaign, FileAsset and audit users.",
  })
  @ApiParam({ name: "id", description: "AdCreative cuid." })
  @ApiOkResponse({ type: AdCreativeAdminResponseDto })
  @ApiNotFoundResponse({
    description:
      "Creative does not exist, was soft-deleted, or belongs to a soft-deleted campaign.",
  })
  findOne(@Param("id") id: string): Promise<AdCreativeAdminResponseDto> {
    return this.adCreativesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update an advertising creative",
    description:
      "Validates the final merged state. Omitted fields remain unchanged; nullable text, assetId and metadata accept explicit null. Activating requires an active IMAGE FileAsset.",
  })
  @ApiParam({ name: "id", description: "AdCreative cuid." })
  @ApiOkResponse({ type: AdCreativeAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid DTO, sort order, non-IMAGE asset, or final active state without an asset.",
  })
  @ApiNotFoundResponse({
    description:
      "Creative or FileAsset does not exist, or the creative/campaign was soft-deleted.",
  })
  @ApiConflictResponse({
    description: "The final active state references an inactive FileAsset.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdCreativeDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdCreativeAdminResponseDto> {
    return this.adCreativesService.update(id, dto, userId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-delete an advertising creative",
    description:
      "Sets isActive=false, deletedAt to the current UTC server time and updatedById from JWT. Campaign and FileAsset records are not modified. Repeated deletion returns 404.",
  })
  @ApiParam({ name: "id", description: "AdCreative cuid." })
  @ApiOkResponse({ type: AdCreativeAdminResponseDto })
  @ApiNotFoundResponse({
    description:
      "Creative does not exist, was already soft-deleted, or belongs to a soft-deleted campaign.",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ): Promise<AdCreativeAdminResponseDto> {
    return this.adCreativesService.remove(id, userId);
  }
}
