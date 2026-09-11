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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { TenantQueryDto } from "./dto/tenant-query.dto";
import { TenantResponseDto } from "./dto/tenant-response.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantsService } from "./tenants.service";

@ApiTags("admin/tenants")
@ApiBearerAuth()
@Controller("admin/tenants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER")
export class TenantsAdminController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOkResponse({ type: [TenantResponseDto] })
  findAll(@Query() query: TenantQueryDto): Promise<TenantResponseDto[]> {
    return this.tenantsService.findAdmin(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: TenantResponseDto })
  findOne(@Param("id") id: string): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: TenantResponseDto })
  create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a tenant.",
    description:
      "Changing isActive from true to false atomically deactivates active, non-deleted tenant promotions. Reactivating the tenant does not reactivate promotions or change store flags.",
  })
  @ApiOkResponse({ type: TenantResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser("id") userId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto, userId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-disable a tenant using isActive=false.",
    description:
      "Atomically deactivates active, non-deleted tenant promotions. Stores are not deleted or deactivated, and re-enabling the tenant does not reactivate promotions.",
  })
  @ApiOkResponse({ type: TenantResponseDto })
  remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.remove(id, userId);
  }
}
