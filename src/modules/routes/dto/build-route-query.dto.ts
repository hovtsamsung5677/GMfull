import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class BuildRouteQueryDto {
  @ApiProperty({
    description: "Start route node id.",
    example: "cmr-route-node-from",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  fromNodeId!: string;

  @ApiProperty({
    description: "Target route node id.",
    example: "cmr-route-node-to",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  toNodeId!: string;

  @ApiPropertyOptional({
    description:
      "Optional floor id. If provided, route is built only on this floor.",
    example: "cmr-floor-1",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional({
    description:
      "Enable emergency evacuation mode: route to the nearest active exit node instead of toNodeId.",
    example: false,
    default: false,
  })
  @Transform(({ value }) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.trim().toLowerCase() === "true";
    }
    return false;
  })
  @IsOptional()
  @IsBoolean()
  emergencyMode?: boolean;
}
