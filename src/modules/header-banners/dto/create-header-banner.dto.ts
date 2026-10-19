import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateHeaderBannerDto {
  @ApiProperty({ example: "Гранд-открытие", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  linkUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  assetId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  targetStoreId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;
}
