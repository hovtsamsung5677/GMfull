import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateAdCreativeDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Existing FileAsset id. Active creatives require an active IMAGE asset.",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  assetId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 500,
    description: "Alternative text for the advertising image.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 200,
    description: "Call-to-action label rendered with the creative.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaText?: string | null;

  @ApiPropertyOptional({
    default: true,
    description:
      "Active creatives must reference an active FileAsset with kind IMAGE.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    maximum: 1_000_000,
    description: "Lower values are returned first in campaign creative lists.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
