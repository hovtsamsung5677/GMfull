import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { toOptionalBoolean } from "../../../common/transformers/query.transformers";

export class SystemSettingQueryDto {
  @ApiPropertyOptional({ example: "routing" })
  @IsOptional()
  @IsString()
  keyPrefix?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpsertSystemSettingDto {
  @ApiProperty({ example: "routing.overloadThreshold" })
  @IsString()
  key!: string;

  @ApiPropertyOptional({ type: Object, example: { requestsPerMinute: 60 } })
  @IsOptional()
  @IsObject()
  value?: Record<string, unknown>;

  @ApiPropertyOptional({ example: "Adaptive routing overload threshold." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class SystemSettingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty({ type: Object })
  value!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isPublic!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}