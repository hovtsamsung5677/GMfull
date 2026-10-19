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
import { AdCampaignAssignmentsService } from "./ad-campaign-assignments.service";
import {
  AdCampaignAssignmentAdminListResponseDto,
  AdCampaignAssignmentAdminResponseDto,
} from "./dto/ad-campaign-assignment-admin-response.dto";
import { AdCampaignAssignmentQueryDto } from "./dto/ad-campaign-assignment-query.dto";
import { CreateAdCampaignAssignmentDto } from "./dto/create-ad-campaign-assignment.dto";
import { UpdateAdCampaignAssignmentDto } from "./dto/update-ad-campaign-assignment.dto";

const AD_CAMPAIGN_ASSIGNMENT_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "MALL_ADMIN",
  "ADS_MANAGER",
];

@ApiTags("admin/ad-campaign-assignments")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description:
    "Allowed roles: SUPER_ADMIN, MALL_ADMIN and ADS_MANAGER. CONTENT_MANAGER and ANALYTICS_VIEWER have no access.",
})
@Controller("admin/ad-campaign-assignments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AD_CAMPAIGN_ASSIGNMENT_ADMIN_ROLES)
export class AdCampaignAssignmentsAdminController {
  constructor(
    private readonly assignmentsService: AdCampaignAssignmentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List campaign-to-slot assignments",
    description:
      "Returns non-deleted assignments with campaignId, slotId and activity filters. Campaign schedule, priority, placement and impression limit are inherited; no public delivery or runtime selection is performed.",
  })
  @ApiOkResponse({ type: AdCampaignAssignmentAdminListResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid boolean, id or pagination query parameter.",
  })
  findAll(
    @Query() query: AdCampaignAssignmentQueryDto,
  ): Promise<AdCampaignAssignmentAdminListResponseDto> {
    return this.assignmentsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get one campaign-to-slot assignment",
    description:
      "Returns one non-deleted assignment with concise Campaign, Slot and audit-user projections.",
  })
  @ApiParam({ name: "id", description: "AdCampaignAssignment cuid." })
  @ApiOkResponse({ type: AdCampaignAssignmentAdminResponseDto })
  @ApiNotFoundResponse({
    description: "Assignment does not exist or has been soft-deleted.",
  })
  findOne(
    @Param("id") id: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: "Assign an advertising campaign to a slot",
    description:
      "Campaign and Slot must be non-deleted and have identical placement. Active assignments require active dependencies and a campaign whose endsAt is in the future or null; future startsAt is allowed. Reposting a soft-deleted pair restores its row and audit history, while reposting a non-deleted pair returns 409.",
  })
  @ApiCreatedResponse({ type: AdCampaignAssignmentAdminResponseDto })
  @ApiBadRequestResponse({ description: "Invalid create DTO." })
  @ApiNotFoundResponse({
    description: "Campaign or Slot is missing or soft-deleted.",
  })
  @ApiConflictResponse({
    description:
      "Duplicate pair, placement mismatch, inactive dependency for an active assignment, or expired active campaign.",
  })
  create(
    @Body() dto: CreateAdCampaignAssignmentDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    return this.assignmentsService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Change assignment activity",
    description:
      "Only isActive can be changed. Reactivation repeats Campaign, Slot, placement, activity and expiration validation. Future campaigns are allowed; campaignId and slotId are immutable.",
  })
  @ApiParam({ name: "id", description: "AdCampaignAssignment cuid." })
  @ApiOkResponse({ type: AdCampaignAssignmentAdminResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid DTO or an attempt to change immutable fields.",
  })
  @ApiNotFoundResponse({
    description:
      "Assignment is missing/soft-deleted or Campaign/Slot is missing/soft-deleted.",
  })
  @ApiConflictResponse({
    description:
      "Placement mismatch, inactive dependency during activation, or expired active campaign.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdCampaignAssignmentDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    return this.assignmentsService.update(id, dto, userId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-delete a campaign assignment",
    description:
      "Sets isActive=false, deletedAt to current UTC time and updatedById from JWT. A later POST of the same pair restores this row instead of creating another one.",
  })
  @ApiParam({ name: "id", description: "AdCampaignAssignment cuid." })
  @ApiOkResponse({ type: AdCampaignAssignmentAdminResponseDto })
  @ApiNotFoundResponse({
    description: "Assignment does not exist or is already soft-deleted.",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    return this.assignmentsService.remove(id, userId);
  }
}
