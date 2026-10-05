import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MapObjectsAdminController } from './map-objects-admin.controller';
import { MapObjectsPublicController } from './map-objects-public.controller';
import { MapObjectsService } from './map-objects.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MapObjectsPublicController, MapObjectsAdminController],
  providers: [MapObjectsService],
})
export class MapObjectsModule {}
