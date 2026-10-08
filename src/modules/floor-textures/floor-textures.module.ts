import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FloorTexturesAdminController } from './floor-textures-admin.controller';
import { FloorTexturesService } from './floor-textures.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FloorTexturesAdminController],
  providers: [FloorTexturesService],
  exports: [FloorTexturesService],
})
export class FloorTexturesModule {}
