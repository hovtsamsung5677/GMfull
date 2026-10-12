import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { RefreshTokensService } from "../refresh-tokens/refresh-tokens.service";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmailForAuth(dto.email);

    if (!user?.passwordHash || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.usersService.updateLastLoginAt(user.id);

    const authUser = this.usersService.toAuthUser(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      isSuperAdmin: authUser.isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.refreshTokensService.create(user.id, {});

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: authUser,
    };
  }

  async refresh(refreshToken: string) {
    const record = await this.refreshTokensService.validate(refreshToken);
    const user = await this.usersService.findByIdForAuth(record.userId);

    if (!user || !user.isActive) {
      await this.refreshTokensService.revoke(refreshToken);
      throw new UnauthorizedException("User is inactive or no longer exists");
    }

    const authUser = this.usersService.toAuthUser(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      isSuperAdmin: authUser.isSuperAdmin,
    };

    const rotated = await this.refreshTokensService.rotate(refreshToken, {});

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken: rotated.token,
    };
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    await this.refreshTokensService.revoke(refreshToken);
    return { success: true };
  }

  async logoutAll(userId: string): Promise<{ revokedCount: number }> {
    const revokedCount =
      await this.refreshTokensService.revokeAllForUser(userId);
    return { revokedCount };
  }

  getMe(user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
