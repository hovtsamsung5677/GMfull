import { ApiProperty } from "@nestjs/swagger";
import { AuthUserResponseDto } from "./auth-user-response.dto";

export class LoginResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken!: string;

  @ApiProperty({
    description: "Long-lived token used to obtain new access tokens.",
  })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
