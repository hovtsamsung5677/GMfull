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
import { NotFoundException } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  SystemSettingQueryDto,
  SystemSettingResponseDto,
  UpsertSystemSettingDto,
} from "./dto/system-setting.dto";
import { SystemSettingsService } from "./system-settings.service";

@ApiTags("admin/system-settings")
@ApiBearerAuth()
@Controller("admin/system-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN")
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: "List system settings, optionally filtered by key prefix." })
  @ApiOkResponse({ type: [SystemSettingResponseDto] })
  findAll(@Query() query: SystemSettingQueryDto) {
    return this.systemSettingsService.find(query);
  }

  @Get(":key")
  @ApiOperation({ summary: "Get one system setting by key." })
  @ApiOkResponse({ type: SystemSettingResponseDto })
  @ApiNotFoundResponse({ description: "System setting not found." })
  async findOne(@Param("key") key: string): Promise<SystemSettingResponseDto> {
    const value = await this.systemSettingsService.getJson(key);
    if (value === null) {
      throw new NotFoundException(`System setting "${key}" not found`);
    }
    return {
      id: "",
      key,
      value: value as Record<string, unknown>,
      description: null,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  @Post()
  @ApiOperation({ summary: "Create or update a system setting by key." })
  @ApiOkResponse({ type: SystemSettingResponseDto })
  create(@Body() dto: UpsertSystemSettingDto) {
    return this.systemSettingsService.upsert(dto);
  }

  @Patch(":key")
  @ApiOperation({ summary: "Update an existing system setting." })
  @ApiOkResponse({ type: SystemSettingResponseDto })
  @ApiNotFoundResponse({ description: "System setting not found." })
  update(@Param("key") key: string, @Body() dto: UpsertSystemSettingDto) {
    return this.systemSettingsService.upsert({ ...dto, key });
  }

  @Delete(":key")
  @ApiOperation({ summary: "Delete a system setting." })
  @ApiOkResponse({ type: SystemSettingResponseDto })
  @ApiNotFoundResponse({ description: "System setting not found." })
  remove(@Param("key") key: string) {
    return this.systemSettingsService.remove(key);
  }
}