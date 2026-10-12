import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({ description: "Long-lived token used to obtain new tokens." })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
