import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RouteNodesAdminController } from './route-nodes-admin.controller';
import { RouteNodesPublicController } from './route-nodes-public.controller';
import { RouteNodesService } from './route-nodes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RouteNodesPublicController, RouteNodesAdminController],
  providers: [RouteNodesService],
  exports: [RouteNodesService],
})
export class RouteNodesModule {}
