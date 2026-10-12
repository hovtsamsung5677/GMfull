import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { MapObjectsService } from "./map-objects.service";
import { PublicUpsertMapObjectDto } from "./dto/public-upsert-map-object.dto";
import { MapObjectResponseDto } from "./dto/map-object-response.dto";

// Устаревший публичный контроллер для расстановки точек магазинов.
// Ранее работал без авторизации — опасный вектор для modifications of the mall map.
// Теперь требует JWT + роль, как остальные админ-эндпоинты.
// Удалить вместе с PublicUpsertMapObjectDto после перехода фронтенда на /admin/map-objects.
@ApiTags("public/map-objects")
@Controller("public/map-objects")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublicMapObjectsController {
  constructor(private readonly mapObjectsService: MapObjectsService) {}

  @Post()
  @Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER")
  @ApiBearerAuth()
  create(@Body() dto: PublicUpsertMapObjectDto): Promise<MapObjectResponseDto> {
    if (!dto.floorId) {
      throw new BadRequestException(
        "floorId is required to create a map object",
      );
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

  @Patch(":id")
  @Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER")
  @ApiBearerAuth()
  update(
    @Param("id") id: string,
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
