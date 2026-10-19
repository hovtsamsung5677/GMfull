import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AdPlacement } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateAdSlotDto {
  @ApiProperty({
    example: "panel-home-main",
    minLength: 1,
    maxLength: 100,
    description:
      "Stable lowercase kebab-case identifier. Input is trimmed and converted to lowercase.",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "code must be lowercase kebab-case using letters, digits and hyphens",
  })
  code!: string;

  @ApiProperty({ example: "Main panel home banner", maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/\S/, { message: "name must contain a non-whitespace character" })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({
    enum: AdPlacement,
    enumName: "AdPlacement",
    example: AdPlacement.HOME_PANEL_BANNER,
  })
  @IsEnum(AdPlacement)
  placement!: AdPlacement;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Existing Panel id. Null creates a global slot without a panel binding.",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  panelId?: string | null;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1_000_000 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      "Display configuration only. Campaign assignments must not be stored here.",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
