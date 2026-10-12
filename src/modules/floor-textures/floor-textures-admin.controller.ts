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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateFloorTextureDto } from "./dto/create-floor-texture.dto";
import { FloorTextureQueryDto } from "./dto/floor-texture-query.dto";
import { FloorTextureResponseDto } from "./dto/floor-texture-response.dto";
import { UpdateFloorTextureDto } from "./dto/update-floor-texture.dto";
import { FloorTexturesService } from "./floor-textures.service";

@ApiTags("admin/floor-textures")
@ApiBearerAuth()
@Controller("admin/floor-textures")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER")
export class FloorTexturesAdminController {
  constructor(private readonly floorTexturesService: FloorTexturesService) {}

  @Get()
  @ApiOperation({
    summary: "List floor textures, optionally filtered by floorId.",
  })
  @ApiOkResponse({ type: [FloorTextureResponseDto] })
  findAll(
    @Query() query: FloorTextureQueryDto,
  ): Promise<FloorTextureResponseDto[]> {
    return this.floorTexturesService.findAll({ floorId: query.floorId });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one floor texture for administration." })
  @ApiOkResponse({ type: FloorTextureResponseDto })
  @ApiNotFoundResponse({ description: "Floor texture not found." })
  findOne(@Param("id") id: string): Promise<FloorTextureResponseDto> {
    return this.floorTexturesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a floor texture mapping." })
  @ApiCreatedResponse({ type: FloorTextureResponseDto })
  @ApiBadRequestResponse({ description: "Invalid texture configuration." })
  @ApiNotFoundResponse({
    description: "Referenced floor or non-image asset not found.",
  })
  create(
    @Body() dto: CreateFloorTextureDto,
    @CurrentUser("id") _userId: string,
  ): Promise<FloorTextureResponseDto> {
    return this.floorTexturesService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a floor texture mapping." })
  @ApiOkResponse({ type: FloorTextureResponseDto })
  @ApiBadRequestResponse({ description: "Invalid texture configuration." })
  @ApiNotFoundResponse({
    description: "Floor texture or referenced asset not found.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFloorTextureDto,
  ): Promise<FloorTextureResponseDto> {
    return this.floorTexturesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-disable a floor texture using isActive=false.",
  })
  @ApiOkResponse({ type: FloorTextureResponseDto })
  @ApiNotFoundResponse({ description: "Floor texture not found." })
  remove(@Param("id") id: string): Promise<FloorTextureResponseDto> {
    return this.floorTexturesService.remove(id);
  }
}
