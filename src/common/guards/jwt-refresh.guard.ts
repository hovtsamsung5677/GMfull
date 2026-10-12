import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { RefreshTokensService } from "../../modules/refresh-tokens/refresh-tokens.service";
import { UsersService } from "../../modules/users/users.service";
import { AuthenticatedUser } from "../types/authenticated-user.type";

/**
 * Validates a refresh token supplied in the request body (`refreshToken`)
 * or `X-Refresh-Token` header and attaches the user to `request.user`.
 */
@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private readonly refreshTokensService: RefreshTokensService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const token =
      (request.body?.refreshToken as string | undefined) ??
      (request.headers["x-refresh-token"] as string | undefined);

    if (!token) {
      throw new UnauthorizedException("Refresh token is required");
    }

    const record = await this.refreshTokensService.validate(token);
    const user = await this.usersService.findByIdForAuth(record.userId);

    if (!user || !user.isActive) {
      await this.refreshTokensService.revoke(token);
      throw new UnauthorizedException("User is inactive or no longer exists");
    }

    request.user = this.usersService.toAuthUser(user);

    return true;
  }
}
