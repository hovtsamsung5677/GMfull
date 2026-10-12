import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { TenantsAdminController } from "./tenants-admin.controller";
import { TenantsService } from "./tenants.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TenantsAdminController],
  providers: [TenantsService],
})
export class TenantsModule {}
