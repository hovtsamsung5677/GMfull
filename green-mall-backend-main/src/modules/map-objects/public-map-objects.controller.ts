import { BadRequestException, Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { MapObjectsService } from './map-objects.service';
import { PublicUpsertMapObjectDto } from './dto/public-upsert-map-object.dto';
import { MapObjectResponseDto } from './dto/map-object-response.dto';

// ВРЕМЕННЫЙ публичный контроллер для расстановки точек магазинов БЕЗ авторизации.
// Нужен только для тестов. Удалить вместе с регистрацией в MapObjectsModule,
// когда появится нормальный админ-доступ из карты.
@Controller('public/map-objects')
export class PublicMapObjectsController {
  constructor(private readonly mapObjectsService: MapObjectsService) {}

  @Post()
  create(@Body() dto: PublicUpsertMapObjectDto): Promise<MapObjectResponseDto> {
    if (!dto.floorId) {
      throw new BadRequestException('floorId is required to create a map object');
    }
    return this.mapObjectsService.create({
      type: dto.type,
      name: dto.name,
      floorId: dto.floorId,
      storeId: dto.storeId ?? null,
      categoryId: dto.categoryId ?? null,
      x: dto.x,
      y: dto.y,
      z: dto.z ?? 0,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: PublicUpsertMapObjectDto,
  ): Promise<MapObjectResponseDto> {
    return this.mapObjectsService.update(id, {
      type: dto.type,
      name: dto.name,
      floorId: dto.floorId ?? undefined,
      storeId: dto.storeId ?? null,
      categoryId: dto.categoryId ?? null,
      x: dto.x,
      y: dto.y,
      z: dto.z ?? 0,
    });
  }
}
