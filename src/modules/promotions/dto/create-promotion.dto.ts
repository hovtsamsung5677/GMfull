import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { toOptionalBoolean } from "../../../common/transformers/query.transformers";

export class CreatePromotionDto {
  @ApiProperty({ example: "Скидка 20% на спортивную одежду" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: "sportmaster-summer-sale",
    description:
      "Public identifier. The backend normalizes it to a lowercase URL-safe slug.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  slug!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 20000,
    description: "Full promotion terms displayed to administrators.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  terms?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "Подробнее",
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buttonText?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "/stores/sportmaster",
    description: "Internal path or absolute CTA URL.",
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  buttonUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      "Required for an active promotion and must match the selected store tenant. Nullable for inactive drafts.",
  })
  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      "Required for an active promotion. Nullable for inactive drafts.",
  })
  @IsOptional()
  @IsString()
  storeId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Active FileAsset id with kind IMAGE.",
  })
  @IsOptional()
  @IsString()
  imageAssetId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: "date-time",
    example: "2026-07-20T07:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: "date-time",
    example: "2026-08-20T20:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional({ default: true, example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
