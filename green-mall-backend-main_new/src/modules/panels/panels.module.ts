import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { PanelsAdminController } from "./panels-admin.controller";
import { PanelsService } from "./panels.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PanelsAdminController],
  providers: [PanelsService],
})
export class PanelsModule {}
