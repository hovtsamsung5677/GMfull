import { ApiPropertyOptional } from "@nestjs/swagger";
import { AdPlacement, AdTargetType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalNumber,
} from "../../../common/transformers/query.transformers";

export class AdCampaignQueryDto {
  @ApiPropertyOptional({
    description: "Case-insensitive search by campaign name.",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: AdPlacement, enumName: "AdPlacement" })
  @IsOptional()
  @IsEnum(AdPlacement)
  placement?: AdPlacement;

  @ApiPropertyOptional({ enum: AdTargetType, enumName: "AdTargetType" })
  @IsOptional()
  @IsEnum(AdTargetType)
  targetType?: AdTargetType;

  @ApiPropertyOptional()
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description:
      "Return campaigns with startsAt greater than or equal to this ISO 8601 timestamp.",
  })
  @IsOptional()
  @IsDateString()
  startsFrom?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description:
      "Return campaigns with startsAt less than or equal to this ISO 8601 timestamp.",
  })
  @IsOptional()
  @IsDateString()
  startsTo?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
