import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AdPlacement, AdTargetType } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateAdCampaignDto {
  @ApiProperty({
    example: "August home panel campaign",
    minLength: 1,
    maxLength: 200,
  })
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

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Tenant owner. Required for STORE campaigns and must match Store.tenantId.",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  tenantId?: string | null;

  @ApiProperty({
    enum: AdPlacement,
    enumName: "AdPlacement",
    example: AdPlacement.HOME_PANEL_BANNER,
  })
  @IsEnum(AdPlacement)
  placement!: AdPlacement;

  @ApiPropertyOptional({
    enum: AdTargetType,
    enumName: "AdTargetType",
    default: AdTargetType.NONE,
    description:
      "STORE requires only targetStoreId; PROMOTION only targetPromotionId; URL only targetUrl; NONE requires no target fields.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(AdTargetType)
  targetType?: AdTargetType;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  targetStoreId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  targetPromotionId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 2048,
    example: "https://greenmall.example/offers",
    description: "Absolute HTTP or HTTPS URL. Other schemes are rejected.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
  })
  targetUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: "date-time",
    example: "2026-08-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: "date-time",
    example: "2026-09-01T00:00:00.000Z",
    description: "Must be strictly later than startsAt when both are set.",
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1_000_000 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priority?: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 2_147_483_647,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  impressionLimit?: number | null;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
