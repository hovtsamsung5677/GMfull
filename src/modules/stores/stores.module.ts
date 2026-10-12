import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { StoresAdminController } from "./stores-admin.controller";
import { StoresPublicController } from "./stores-public.controller";
import { StoresService } from "./stores.service";

@Module({
  imports: [DatabaseModule],
  controllers: [StoresPublicController, StoresAdminController],
  providers: [StoresService],
})
export class StoresModule {}
