import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenResponseDto {
  @ApiProperty({ description: "New short-lived access token." })
  accessToken!: string;

  @ApiProperty({ description: "New refresh token (previous one is revoked)." })
  refreshToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class LogoutAllResponseDto {
  @ApiProperty({ example: 3, description: "Number of revoked refresh tokens." })
  revokedCount!: number;
}
