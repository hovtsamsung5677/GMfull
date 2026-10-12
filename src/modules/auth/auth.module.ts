import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { SignOptions } from "jsonwebtoken";
import { AppConfiguration } from "../../config/configuration";
import { RefreshTokensModule } from "../refresh-tokens/refresh-tokens.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<AppConfiguration>("app");

        if (!config) {
          throw new Error("Application configuration is not loaded");
        }

        return {
          secret: config.jwt.secret,
          signOptions: {
            expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"],
            algorithm: "HS256",
          },
        };
      },
    }),
    RefreshTokensModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
