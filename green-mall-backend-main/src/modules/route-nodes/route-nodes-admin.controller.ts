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
import { CreateRouteNodeDto } from './dto/create-route-node.dto';
import { RouteNodeQueryDto } from './dto/route-node-query.dto';
import { RouteNodeResponseDto } from './dto/route-node-response.dto';
import { UpdateRouteNodeDto } from './dto/update-route-node.dto';
import { RouteNodesService } from './route-nodes.service';

@ApiTags('admin/route-nodes')
@ApiBearerAuth()
@Controller('admin/route-nodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER')
export class RouteNodesAdminController {
  constructor(private readonly routeNodesService: RouteNodesService) {}

  @Get()
  @ApiOperation({ summary: 'List all route nodes, including inactive nodes.' })
  @ApiOkResponse({ type: [RouteNodeResponseDto] })
  findAll(@Query() query: RouteNodeQueryDto) {
    return this.routeNodesService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one route node for administration.' })
  @ApiOkResponse({ type: RouteNodeResponseDto })
  @ApiNotFoundResponse({ description: 'Route node not found.' })
  findOne(@Param('id') id: string) {
    return this.routeNodesService.findAdminOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a 2D/3D-ready navigation node.' })
  @ApiCreatedResponse({ type: RouteNodeResponseDto })
  @ApiBadRequestResponse({
    description: 'Route node and map object floors differ.',
  })
  @ApiNotFoundResponse({
    description: 'Referenced floor or map object not found.',
  })
  create(@Body() dto: CreateRouteNodeDto) {
    return this.routeNodesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update navigation coordinates and map anchor.' })
  @ApiOkResponse({ type: RouteNodeResponseDto })
  @ApiBadRequestResponse({
    description: 'Route node and map object floors differ.',
  })
  @ApiNotFoundResponse({
    description: 'Route node or referenced entity not found.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateRouteNodeDto) {
    return this.routeNodesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-disable a route node using isActive=false.' })
  @ApiOkResponse({ type: RouteNodeResponseDto })
  @ApiNotFoundResponse({ description: 'Route node not found.' })
  remove(@Param('id') id: string) {
    return this.routeNodesService.remove(id);
  }
}
