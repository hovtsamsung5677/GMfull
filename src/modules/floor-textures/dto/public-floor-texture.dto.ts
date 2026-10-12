import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PublicFileAssetResponseDto } from "../../file-assets/dto/public-file-asset-response.dto";

export class PublicFloorTextureDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  floorId!: string;

  @ApiPropertyOptional({ type: PublicFileAssetResponseDto, nullable: true })
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
}
