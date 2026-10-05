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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFloorIconDto } from './dto/create-floor-icon.dto';
import { FloorIconQueryDto } from './dto/floor-icon-query.dto';
import { FloorIconResponseDto } from './dto/floor-icon-response.dto';
import { UpdateFloorIconDto } from './dto/update-floor-icon.dto';
import { FloorIconsService } from './floor-icons.service';

@ApiTags('admin/floor-icons')
@ApiBearerAuth()
@Controller('admin/floor-icons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER')
export class FloorIconsAdminController {
  constructor(private readonly service: FloorIconsService) {}

  @Get()
  @ApiOperation({ summary: 'List all floor icons for admin.' })
  @ApiOkResponse({ type: [FloorIconResponseDto] })
  findAll(@Query() query: FloorIconQueryDto): Promise<FloorIconResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one floor icon.' })
  @ApiOkResponse({ type: FloorIconResponseDto })
  @ApiNotFoundResponse({ description: 'Floor icon not found.' })
  findOne(@Param('id') id: string): Promise<FloorIconResponseDto | null> {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a floor icon.' })
  @ApiCreatedResponse({ type: FloorIconResponseDto })
  @ApiNotFoundResponse({ description: 'Referenced floor or asset not found.' })
  create(@Body() dto: CreateFloorIconDto): Promise<FloorIconResponseDto> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a floor icon.' })
  @ApiOkResponse({ type: FloorIconResponseDto })
  @ApiNotFoundResponse({ description: 'Floor icon not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateFloorIconDto): Promise<FloorIconResponseDto | null> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a floor icon (isActive=false).' })
  @ApiOkResponse({ type: FloorIconResponseDto })
  @ApiNotFoundResponse({ description: 'Floor icon not found.' })
  remove(@Param('id') id: string): Promise<FloorIconResponseDto | null> {
    return this.service.remove(id);
  }
}
