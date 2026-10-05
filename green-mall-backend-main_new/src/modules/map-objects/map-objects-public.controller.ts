import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MapObjectQueryDto } from './dto/map-object-query.dto';
import { MapObjectResponseDto } from './dto/map-object-response.dto';
import { PublicMapSceneQueryDto } from './dto/public-map-scene-query.dto';
import { PublicMapSceneResponseDto } from './dto/public-map-scene-response.dto';
import { PublicMapResponseDto } from './dto/public-map-response.dto';
import { MapObjectsService } from './map-objects.service';

@ApiTags('public/map-objects')
@Controller()
export class MapObjectsPublicController {
  constructor(private readonly mapObjectsService: MapObjectsService) {}

  @Get('public/map-objects')
  @ApiOkResponse({ type: [MapObjectResponseDto] })
  findAll(@Query() query: MapObjectQueryDto): Promise<MapObjectResponseDto[]> {
    return this.mapObjectsService.findPublic(query);
  }

  @Get('public/map-objects/:id')
  @ApiOkResponse({ type: MapObjectResponseDto })
  findOne(@Param('id') id: string): Promise<MapObjectResponseDto> {
    return this.mapObjectsService.findPublicOne(id);
  }

  @Get('public/floors/:floorId/map-objects')
  @ApiOkResponse({ type: [MapObjectResponseDto] })
  findByFloor(
    @Param('floorId') floorId: string,
    @Query() query: MapObjectQueryDto,
  ): Promise<MapObjectResponseDto[]> {
    return this.mapObjectsService.findPublicByFloor(floorId, query);
  }

  @Get('public/floors/:floorId/scene')
  @ApiOkResponse({ type: PublicMapSceneResponseDto })
  findSceneByFloor(
    @Param('floorId') floorId: string,
  ): Promise<PublicMapSceneResponseDto> {
    return this.mapObjectsService.findPublicSceneByFloor(floorId);
  }

  @Get('public/map/scene')
  @ApiOkResponse({ type: PublicMapSceneResponseDto })
  findScene(
    @Query() query: PublicMapSceneQueryDto,
  ): Promise<PublicMapSceneResponseDto> {
    return this.mapObjectsService.findPublicScene(query.floorId);
  }

  @Get('public/map')
  @ApiOkResponse({ type: PublicMapResponseDto })
  findMap(): Promise<PublicMapResponseDto> {
    return this.mapObjectsService.findPublicMap();
  }
}
