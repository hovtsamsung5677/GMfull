import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { RefreshTokensService } from "./refresh-tokens.service";

@Module({
  imports: [DatabaseModule],
  providers: [RefreshTokensService],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
