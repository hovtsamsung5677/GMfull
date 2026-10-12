import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateFloorTextureDto {
  @ApiProperty({ example: "floor-abc123" })
  @IsString()
  @MaxLength(255)
  floorId!: string;

  @ApiProperty({ example: "asset-xyz789" })
  @IsString()
  @MaxLength(255)
  assetId!: string;

  @ApiProperty({ example: "wall_front" })
  @IsString()
  @MaxLength(255)
  targetMesh!: string;

  @ApiPropertyOptional({
    example: "0",
    description: "Material index if mesh has multiple materials.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  materialSlot?: string;

  @ApiPropertyOptional({ example: 1, description: "Opacity multiplier, 0..1." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  opacity?: number;

  @ApiPropertyOptional({
    example: "normal",
    description: "normal | alphaMap | emissiveMap",
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  blendMode?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  scaleX?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  scaleY?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
