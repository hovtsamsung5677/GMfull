import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RouteEdgesAdminController } from './route-edges-admin.controller';
import { RouteEdgesPublicController } from './route-edges-public.controller';
import { RouteEdgesService } from './route-edges.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RouteEdgesPublicController, RouteEdgesAdminController],
  providers: [RouteEdgesService],
})
export class RouteEdgesModule {}
