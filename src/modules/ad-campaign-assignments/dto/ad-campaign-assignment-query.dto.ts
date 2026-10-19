import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalNumber,
} from "../../../common/transformers/query.transformers";

export class AdCampaignAssignmentQueryDto {
  @ApiPropertyOptional({ description: "Filter by exact AdCampaign id." })
  @IsOptional()
  @IsString()
  @MinLength(1)
  campaignId?: string;

  @ApiPropertyOptional({ description: "Filter by exact AdSlot id." })
  @IsOptional()
  @IsString()
  @MinLength(1)
  slotId?: string;

  @ApiPropertyOptional()
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
