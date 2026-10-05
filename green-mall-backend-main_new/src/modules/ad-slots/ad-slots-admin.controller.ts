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
import { AdSlotsService } from "./ad-slots.service";
import {
  AdSlotAdminListResponseDto,
  AdSlotAdminResponseDto,
} from "./dto/ad-slot-admin-response.dto";
import { AdSlotQueryDto } from "./dto/ad-slot-query.dto";
import { CreateAdSlotDto } from "./dto/create-ad-slot.dto";
import { UpdateAdSlotDto } from "./dto/update-ad-slot.dto";

const AD_SLOT_ADMIN_ROLES = ["SUPER_ADMIN", "MALL_ADMIN", "ADS_MANAGER"];

@ApiTags("admin/ad-slots")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description:
    "Allowed roles: SUPER_ADMIN, MALL_ADMIN and ADS_MANAGER. CONTENT_MANAGER and ANALYTICS_VIEWER have no access.",
})
@Controller("admin/ad-slots")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AD_SLOT_ADMIN_ROLES)
export class AdSlotsAdminController {
  constructor(private readonly adSlotsService: AdSlotsService) {}

  @Get()
  @ApiOperation({
    summary: "List advertising slots",
    description:
      "Returns non-deleted global and panel-specific advertising slots. Supports case-insensitive search, placement, panel, activity and pagination filters. No public delivery endpoint is created at this stage.",
  })
  @ApiOkResponse({ type: AdSlotAdminListResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid placement, boolean or pagination query value.",
  })
  findAll(@Query() query: AdSlotQueryDto): Promise<AdSlotAdminListResponseDto> {
    return this.adSlotsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get one advertising slot",
    description:
      "Returns one non-deleted slot with safe Panel and audit-user summaries. A null panelId identifies a global slot.",
  })
  @ApiParam({ name: "id", description: "AdSlot cuid." })
  @ApiOkResponse({ type: AdSlotAdminResponseDto })
  @ApiNotFoundResponse({
    description: "Ad slot does not exist or has been soft-deleted.",
  })
  findOne(@Param("id") id: string): Promise<AdSlotAdminResponseDto> {
    return this.adSlotsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create an advertising slot",
    description:
      "Registers a global or panel-specific advertising place. The code is normalized to lowercase kebab-case and remains reserved after soft deletion. Audit user ids come from JWT. Campaign assignment and scheduling are outside this endpoint.",
  })
  @ApiCreatedResponse({ type: AdSlotAdminResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid DTO, code format, placement, sort order or metadata.",
  })
  @ApiNotFoundResponse({ description: "Referenced Panel was not found." })
  @ApiConflictResponse({
    description:
      "The normalized code is already reserved by an active or soft-deleted slot.",
  })
  create(
    @Body() dto: CreateAdSlotDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdSlotAdminResponseDto> {
    return this.adSlotsService.create(dto, userId);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Partially update an advertising slot",
    description:
      "Validates the complete merged state and preserves omitted fields. Passing panelId=null converts a panel-specific slot into a global slot. Soft-deleted slots cannot be edited.",
  })
  @ApiParam({ name: "id", description: "AdSlot cuid." })
  @ApiOkResponse({ type: AdSlotAdminResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid DTO, code format, placement, sort order or metadata.",
  })
  @ApiNotFoundResponse({
    description:
      "Ad slot is missing/soft-deleted or the referenced Panel was not found.",
  })
  @ApiConflictResponse({
    description:
      "The normalized code is already reserved, or the requested placement conflicts with a non-deleted campaign assignment.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdSlotDto,
    @CurrentUser("id") userId: string,
  ): Promise<AdSlotAdminResponseDto> {
    return this.adSlotsService.update(id, dto, userId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-delete an advertising slot",
    description:
      "Sets isActive=false, deletedAt to the current UTC timestamp and updatedById from JWT. Panel and audit users are not modified. Repeated deletion returns 404.",
  })
  @ApiParam({ name: "id", description: "AdSlot cuid." })
  @ApiOkResponse({ type: AdSlotAdminResponseDto })
  @ApiNotFoundResponse({
    description: "Ad slot does not exist or is already soft-deleted.",
  })
  remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ): Promise<AdSlotAdminResponseDto> {
    return this.adSlotsService.remove(id, userId);
  }
}
