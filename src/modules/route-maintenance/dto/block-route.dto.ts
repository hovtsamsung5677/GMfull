import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class BlockRouteDto {
  @ApiPropertyOptional({ example: "Лифт на техническом обслуживании." })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: "ISO-8601 date until which the route stays blocked.",
    example: "2026-10-15T10:00:00.000Z",
  })
  @IsOptional()
  @IsString()
  blockedUntil?: string;
}