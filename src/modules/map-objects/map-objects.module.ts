import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { FloorTexturesModule } from "../floor-textures/floor-textures.module";
import { MapObjectsAdminController } from "./map-objects-admin.controller";
import { MapObjectsPublicController } from "./map-objects-public.controller";
import { PublicMapObjectsController } from "./public-map-objects.controller";
import { MapObjectsService } from "./map-objects.service";

@Module({
  imports: [DatabaseModule, FloorTexturesModule],
  controllers: [
    MapObjectsPublicController,
    MapObjectsAdminController,
    PublicMapObjectsController,
  ],
  providers: [MapObjectsService],
})
export class MapObjectsModule {}
