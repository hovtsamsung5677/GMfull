import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PublicFileAssetResponseDto } from "../../file-assets/dto/public-file-asset-response.dto";

export class FloorTextureResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  floorId!: string;

  @ApiPropertyOptional({ type: PublicFileAssetResponseDto })
  asset!: PublicFileAssetResponseDto | null;

  @ApiProperty()
  targetMesh!: string;

  @ApiPropertyOptional()
  materialSlot!: string | null;

  @ApiPropertyOptional()
  opacity!: number | null;

  @ApiPropertyOptional()
  blendMode!: string | null;

  @ApiPropertyOptional()
  positionX!: number | null;

  @ApiPropertyOptional()
  positionY!: number | null;

  @ApiPropertyOptional()
  scaleX!: number | null;

  @ApiPropertyOptional()
  scaleY!: number | null;

  @ApiPropertyOptional()
  rotation!: number | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
