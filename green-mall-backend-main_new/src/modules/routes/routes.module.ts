import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RouteNodesModule } from '../route-nodes/route-nodes.module';
import { RoutesPublicController } from './routes-public.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [DatabaseModule, RouteNodesModule],
  controllers: [RoutesPublicController],
  providers: [RoutesService],
})
export class RoutesModule {}
