import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PanelsAdminController } from './panels-admin.controller';
import { PanelsPublicController } from './panels-public.controller';
import { PanelsGateway } from './panels.gateway';
import { PanelsService } from './panels.service';
import { PanelStatusBroadcasterService } from './panel-status-broadcaster.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PanelsAdminController, PanelsPublicController],
  providers: [PanelsService, PanelsGateway, PanelStatusBroadcasterService],
})
export class PanelsModule {}
