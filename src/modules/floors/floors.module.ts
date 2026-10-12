import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { FloorsAdminController } from "./floors-admin.controller";
import { FloorsPublicController } from "./floors-public.controller";
import { FloorsService } from "./floors.service";

@Module({
  imports: [DatabaseModule],
  controllers: [FloorsPublicController, FloorsAdminController],
  providers: [FloorsService],
})
export class FloorsModule {}
