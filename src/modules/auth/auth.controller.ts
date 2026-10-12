import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtRefreshGuard } from "../../common/guards/jwt-refresh.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { AuthService } from "./auth.service";
import { AuthUserResponseDto } from "./dto/auth-user-response.dto";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import {
  LogoutAllResponseDto,
  LogoutResponseDto,
  RefreshTokenResponseDto,
} from "./dto/refresh-response.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @ApiOkResponse({ type: RefreshTokenResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token." })
  refresh(@Body() dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @ApiBearerAuth()
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  logout(@Body() dto: RefreshTokenDto): Promise<LogoutResponseDto> {
    return this.authService.logout(dto.refreshToken);
  }

  @Post("logout-all")
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: LogoutAllResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token." })
  logoutAll(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<LogoutAllResponseDto> {
    return this.authService.logoutAll(req.user.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return this.authService.getMe(user);
  }
}
