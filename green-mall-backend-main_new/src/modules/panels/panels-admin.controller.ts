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
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreatePanelDto } from "./dto/create-panel.dto";
import {
  PanelAdminListResponseDto,
  PanelAdminResponseDto,
} from "./dto/panel-admin-response.dto";
import { PanelQueryDto } from "./dto/panel-query.dto";
import { UpdatePanelDto } from "./dto/update-panel.dto";
import { PanelsService } from "./panels.service";

const PANEL_ADMIN_ROLES = ["SUPER_ADMIN", "MALL_ADMIN"];

@ApiTags("admin/panels")
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: "JWT access token is missing or invalid.",
})
@ApiForbiddenResponse({
  description:
    "Allowed roles: SUPER_ADMIN and MALL_ADMIN. CONTENT_MANAGER, ADS_MANAGER and ANALYTICS_VIEWER have no access.",
})
@Controller("admin/panels")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PANEL_ADMIN_ROLES)
export class PanelsAdminController {
  constructor(private readonly panelsService: PanelsService) {}

  @Get()
  @ApiOperation({
    summary: "List navigation panels",
    description:
      "Returns the administrative Panel registry with safe Floor and RouteNode summaries. Supports search by code/name, floor, runtime status, activity and pagination filters. Runtime heartbeat monitoring is outside this API.",
  })
  @ApiOkResponse({ type: PanelAdminListResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid status, boolean or pagination query value.",
  })
  findAll(@Query() query: PanelQueryDto): Promise<PanelAdminListResponseDto> {
    return this.panelsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get one navigation panel",
    description:
      "Returns one Panel with safe Floor and PANEL RouteNode summaries. status, appVersion and lastSeenAt are read-only runtime fields in this configuration API.",
  })
  @ApiParam({ name: "id", description: "Panel cuid." })
  @ApiOkResponse({ type: PanelAdminResponseDto })
  @ApiNotFoundResponse({ description: "Panel was not found." })
  findOne(@Param("id") id: string): Promise<PanelAdminResponseDto> {
    return this.panelsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a navigation panel configuration",
    description:
      "Creates a Panel with a normalized unique code. An active Panel requires an existing Floor and a unique same-floor RouteNode of type PANEL. status, appVersion and lastSeenAt cannot be set through this endpoint.",
  })
  @ApiCreatedResponse({ type: PanelAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid DTO, code/name format, incomplete active configuration, non-PANEL RouteNode or floor mismatch.",
  })
  @ApiNotFoundResponse({
    description: "Referenced Floor or RouteNode was not found.",
  })
  @ApiConflictResponse({
    description:
      "Panel code already exists or RouteNode is assigned to another Panel.",
  })
  create(@Body() dto: CreatePanelDto): Promise<PanelAdminResponseDto> {
    return this.panelsService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Partially update a navigation panel configuration",
    description:
      "Validates the complete merged state and preserves omitted fields. Explicit null is supported for floorId, routeNodeId, description and location. Activating a Panel requires a unique same-floor PANEL RouteNode. Runtime status/appVersion/lastSeenAt remain read-only.",
  })
  @ApiParam({ name: "id", description: "Panel cuid." })
  @ApiOkResponse({ type: PanelAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid DTO or the merged state violates active configuration, RouteNode type or floor consistency rules.",
  })
  @ApiNotFoundResponse({
    description: "Panel, referenced Floor or RouteNode was not found.",
  })
  @ApiConflictResponse({
    description:
      "Panel code already exists or RouteNode is assigned to another Panel.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePanelDto,
  ): Promise<PanelAdminResponseDto> {
    return this.panelsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-disable a navigation panel",
    description:
      "Sets isActive=false without deleting the Panel row or breaking AdSlot and AnalyticsEvent references. Repeated DELETE is idempotent and returns the same inactive Panel.",
  })
  @ApiParam({ name: "id", description: "Panel cuid." })
  @ApiOkResponse({ type: PanelAdminResponseDto })
  @ApiNotFoundResponse({ description: "Panel was not found." })
  remove(@Param("id") id: string): Promise<PanelAdminResponseDto> {
    return this.panelsService.remove(id);
  }
}
