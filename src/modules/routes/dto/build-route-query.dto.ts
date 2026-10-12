import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

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
}
