import { ApiProperty } from "@nestjs/swagger";
import { FloorPublicResponseDto } from "../../floors/dto/floor-public-response.dto";
import { MapObjectResponseDto } from "./map-object-response.dto";

export class PublicMapResponseDto {
  @ApiProperty({ type: [FloorPublicResponseDto] })
  floors!: FloorPublicResponseDto[];

  @ApiProperty({ type: [MapObjectResponseDto] })
  objects!: MapObjectResponseDto[];
}
