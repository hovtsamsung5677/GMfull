import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdSlotsAdminController } from "./ad-slots-admin.controller";
import { AdSlotsService } from "./ad-slots.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdSlotsAdminController],
  providers: [AdSlotsService],
})
export class AdSlotsModule {}
