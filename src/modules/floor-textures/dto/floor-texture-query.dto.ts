import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FloorTextureQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by floor id.',
  })
  @IsOptional()
  @IsString()
  floorId?: string;
}
