import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FloorIconsAdminController } from './floor-icons-admin.controller';
import { FloorIconsPublicController } from './floor-icons-public.controller';
import { FloorIconsService } from './floor-icons.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FloorIconsPublicController, FloorIconsAdminController],
  providers: [FloorIconsService],
})
export class FloorIconsModule {}
