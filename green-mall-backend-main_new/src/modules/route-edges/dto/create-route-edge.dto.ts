import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteEdgeType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalNumber,
} from "../../../common/transformers/query.transformers";

export class CreateRouteEdgeDto {
  @ApiPropertyOptional({
    enum: RouteEdgeType,
    default: RouteEdgeType.WALKWAY,
    description:
      "WALKWAY connects nodes on one floor. ELEVATOR, ESCALATOR and STAIRS connect matching vertical nodes on different floors.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(RouteEdgeType)
  type?: RouteEdgeType;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Required for WALKWAY and must match both nodes. Must be null or omitted for a vertical edge.",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  floorId?: string | null;

  @ApiProperty({ description: "Existing source RouteNode id." })
  @IsString()
  fromNodeId!: string;

  @ApiProperty({ description: "Existing target RouteNode id." })
  @IsString()
  toNodeId!: string;

  @ApiPropertyOptional({
    example: 120,
    minimum: 1,
    description: "Positive segment distance. Used when weight is not set.",
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  distance?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: "Positive Dijkstra cost. Takes precedence over distance.",
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      "When true, the route can traverse this edge in both directions.",
  })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isBidirectional?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
