import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmailForAuth(dto.email);

    if (!user?.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.updateLastLoginAt(user.id);

    const authUser = this.usersService.toAuthUser(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: authUser,
    };
  }

  getMe(user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
