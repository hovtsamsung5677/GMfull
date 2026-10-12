import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Nullable } from "../../../common/decorators/nullable.decorator";
import {
  toOptionalBoolean,
  toOptionalNumber,
} from "../../../common/transformers/query.transformers";

export class CreateFloorDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  number!: number;

  @ApiProperty({ example: "First floor" })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "https://example.com/floor-1.png" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapImageUrl?: string;

  @ApiPropertyOptional({
    example: 1920,
    description: "Floor scene width in the units specified by unit.",
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @ApiPropertyOptional({
    example: 1080,
    description: "Floor scene height in the units specified by unit.",
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @ApiPropertyOptional({
    example: 300,
    description: "Optional depth of the future 3D floor scene.",
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @IsPositive()
  depth?: number;

  @ApiPropertyOptional({
    example: "px",
    description:
      "Coordinate unit used by the floor scene, for example px, meter or cm.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: "Existing FileAsset id for a future 2D floor map asset.",
  })
  @Nullable()
  @IsOptional()
  @IsString()
  mapAssetId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Existing FileAsset id for a future 3D floor model asset.",
  })
  @Nullable()
  @IsOptional()
  @IsString()
  modelAssetId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    description: "Frontend rendering and coordinate-system settings.",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
