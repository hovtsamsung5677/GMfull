import { ApiProperty } from '@nestjs/swagger';
import { FloorResponseDto } from '../../floors/dto/floor-response.dto';
import { MapObjectResponseDto } from './map-object-response.dto';

export class PublicMapResponseDto {
  @ApiProperty({ type: [FloorResponseDto] })
  floors!: FloorResponseDto[];

  @ApiProperty({ type: [MapObjectResponseDto] })
  objects!: MapObjectResponseDto[];
}
