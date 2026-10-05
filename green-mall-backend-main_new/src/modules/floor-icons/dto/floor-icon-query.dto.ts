import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FloorIconQueryDto {
  @ApiPropertyOptional({ example: 'floor_abc123' })
  @IsOptional()
  @IsString()
  floorId?: string;
}
