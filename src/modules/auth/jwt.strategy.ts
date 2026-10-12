import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AppConfiguration } from "../../config/configuration";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { UsersService } from "../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    const config = configService.get<AppConfiguration>("app");

    if (!config) {
      throw new Error("Application configuration is not loaded");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ["HS256"],
      secretOrKey: config.jwt.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByIdForAuth(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User is inactive or no longer exists");
    }

    return this.usersService.toAuthUser(user);
  }
}
