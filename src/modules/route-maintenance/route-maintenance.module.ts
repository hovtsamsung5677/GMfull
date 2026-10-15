import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { RouteMaintenanceController } from "./route-maintenance.controller";
import { RouteMaintenanceService } from "./route-maintenance.service";

@Module({
  imports: [DatabaseModule],
  controllers: [RouteMaintenanceController],
  providers: [RouteMaintenanceService],
})
export class RouteMaintenanceModule {}