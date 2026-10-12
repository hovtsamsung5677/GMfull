import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DatabaseModule } from "../../database/database.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [DatabaseModule],
  controllers: [RolesController],
  providers: [RolesService, RolesGuard],
})
export class RolesModule {}
