import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SharedRoutesController } from './shared-routes.controller';
import { SharedRoutesService } from './shared-routes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SharedRoutesController],
  providers: [SharedRoutesService],
})
export class SharedRoutesModule {}
