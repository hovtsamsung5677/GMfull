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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFloorDto } from './dto/create-floor.dto';
import { FloorQueryDto } from './dto/floor-query.dto';
import { FloorResponseDto } from './dto/floor-response.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { FloorsService } from './floors.service';

@ApiTags('admin/floors')
@ApiBearerAuth()
@Controller('admin/floors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER')
export class FloorsAdminController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all floors, including inactive floors.' })
  @ApiOkResponse({ type: [FloorResponseDto] })
  findAll(@Query() query: FloorQueryDto): Promise<FloorResponseDto[]> {
    return this.floorsService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one floor for administration.' })
  @ApiOkResponse({ type: FloorResponseDto })
  @ApiNotFoundResponse({ description: 'Floor not found.' })
  findOne(@Param('id') id: string): Promise<FloorResponseDto> {
    return this.floorsService.findAdminOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a 2D/3D-ready floor definition.' })
  @ApiCreatedResponse({ type: FloorResponseDto })
  @ApiConflictResponse({ description: 'Floor number already exists.' })
  @ApiNotFoundResponse({
    description: 'Referenced map or model asset not found.',
  })
  create(@Body() dto: CreateFloorDto): Promise<FloorResponseDto> {
    return this.floorsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update floor dimensions, assets and metadata.' })
  @ApiOkResponse({ type: FloorResponseDto })
  @ApiConflictResponse({ description: 'Floor number already exists.' })
  @ApiNotFoundResponse({ description: 'Floor or referenced asset not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFloorDto,
  ): Promise<FloorResponseDto> {
    return this.floorsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-disable a floor using isActive=false.' })
  @ApiOkResponse({ type: FloorResponseDto })
  @ApiNotFoundResponse({ description: 'Floor not found.' })
  remove(@Param('id') id: string): Promise<FloorResponseDto> {
    return this.floorsService.remove(id);
  }
}
