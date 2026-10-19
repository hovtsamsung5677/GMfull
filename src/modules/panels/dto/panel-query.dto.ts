import { ApiPropertyOptional } from "@nestjs/swagger";
import { PanelStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
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

export class PanelQueryDto {
  @ApiPropertyOptional({
    description: "Case-insensitive search by Panel code or name.",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Return Panels assigned to this Floor id.",
  })
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional({ enum: PanelStatus, enumName: "PanelStatus" })
  @IsOptional()
  @IsEnum(PanelStatus)
  status?: PanelStatus;

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
