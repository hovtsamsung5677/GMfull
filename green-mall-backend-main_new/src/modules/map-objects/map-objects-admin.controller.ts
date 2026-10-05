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
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMapObjectDto } from './dto/create-map-object.dto';
import { MapObjectQueryDto } from './dto/map-object-query.dto';
import { MapObjectResponseDto } from './dto/map-object-response.dto';
import { UpdateMapObjectDto } from './dto/update-map-object.dto';
import { MapObjectsService } from './map-objects.service';

@ApiTags('admin/map-objects')
@ApiBearerAuth()
@Controller('admin/map-objects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER')
export class MapObjectsAdminController {
  constructor(private readonly mapObjectsService: MapObjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all map objects, including inactive objects.',
  })
  @ApiOkResponse({ type: [MapObjectResponseDto] })
  findAll(@Query() query: MapObjectQueryDto): Promise<MapObjectResponseDto[]> {
    return this.mapObjectsService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one map object for administration.' })
  @ApiOkResponse({ type: MapObjectResponseDto })
  @ApiNotFoundResponse({ description: 'Map object not found.' })
  findOne(@Param('id') id: string): Promise<MapObjectResponseDto> {
    return this.mapObjectsService.findAdminOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a frontend-ready 2D/3D map object.' })
  @ApiCreatedResponse({ type: MapObjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid geometry or floor relation.' })
  @ApiNotFoundResponse({
    description: 'Referenced floor, store or category not found.',
  })
  create(@Body() dto: CreateMapObjectDto): Promise<MapObjectResponseDto> {
    return this.mapObjectsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update geometry, transform and map relations.' })
  @ApiOkResponse({ type: MapObjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid geometry or floor relation.' })
  @ApiNotFoundResponse({
    description: 'Map object or referenced entity not found.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMapObjectDto,
  ): Promise<MapObjectResponseDto> {
    return this.mapObjectsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-disable a map object using isActive=false.' })
  @ApiOkResponse({ type: MapObjectResponseDto })
  @ApiNotFoundResponse({ description: 'Map object not found.' })
  remove(@Param('id') id: string): Promise<MapObjectResponseDto> {
    return this.mapObjectsService.remove(id);
  }
}
