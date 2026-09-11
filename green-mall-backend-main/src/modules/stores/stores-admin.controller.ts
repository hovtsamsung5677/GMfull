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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateStoreDto } from "./dto/create-store.dto";
import { StoreAdminResponseDto } from "./dto/store-admin-response.dto";
import { StoreQueryDto } from "./dto/store-query.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { StoresService } from "./stores.service";

@ApiTags("admin/stores")
@ApiBearerAuth()
@Controller("admin/stores")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER")
export class StoresAdminController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: "List stores with admin map relations." })
  @ApiOkResponse({ type: [StoreAdminResponseDto] })
  findAll(@Query() query: StoreQueryDto): Promise<StoreAdminResponseDto[]> {
    return this.storesService.findAdmin(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one store with map and route node ids." })
  @ApiOkResponse({ type: StoreAdminResponseDto })
  @ApiNotFoundResponse({ description: "Store not found." })
  findOne(@Param("id") id: string): Promise<StoreAdminResponseDto> {
    return this.storesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a store and validate its map relations." })
  @ApiCreatedResponse({ type: StoreAdminResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid floor or inconsistent map/route node relation.",
  })
  @ApiConflictResponse({
    description: "Slug conflict or map object belongs to another store.",
  })
  @ApiNotFoundResponse({
    description:
      "Referenced tenant, category, floor, map object or route node was not found.",
  })
  create(@Body() dto: CreateStoreDto): Promise<StoreAdminResponseDto> {
    return this.storesService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a store and synchronize map relations.",
    description:
      "Changing isActive from true to false atomically deactivates active, non-deleted store promotions. Reactivating the store does not reactivate promotions.",
  })
  @ApiOkResponse({ type: StoreAdminResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid floor or inconsistent map/route node relation.",
  })
  @ApiConflictResponse({
    description:
      "Slug conflict, map object belongs to another store, or tenantId cannot change while non-deleted store promotions exist.",
  })
  @ApiNotFoundResponse({
    description: "Store or one of the referenced entities was not found.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser("id") userId: string,
  ): Promise<StoreAdminResponseDto> {
    return this.storesService.update(id, dto, userId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-disable a store using isActive=false.",
    description:
      "Atomically deactivates active, non-deleted store promotions. Re-enabling the store later does not reactivate them.",
  })
  @ApiOkResponse({ type: StoreAdminResponseDto })
  @ApiNotFoundResponse({ description: "Store not found." })
  remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ): Promise<StoreAdminResponseDto> {
    return this.storesService.remove(id, userId);
  }
}
