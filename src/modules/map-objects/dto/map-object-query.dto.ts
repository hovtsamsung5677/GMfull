import { ApiPropertyOptional } from "@nestjs/swagger";
import { MapObjectType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  toOptionalBoolean,
  toOptionalNumber,
} from "../../../common/transformers/query.transformers";

export class MapObjectQueryDto {
  @ApiPropertyOptional({ example: "entrance" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: MapObjectType })
  @IsOptional()
  @IsEnum(MapObjectType)
  type?: MapObjectType;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
