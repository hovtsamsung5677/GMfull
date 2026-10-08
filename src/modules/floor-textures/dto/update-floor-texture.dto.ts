import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateFloorTextureDto } from './create-floor-texture.dto';

export class UpdateFloorTextureDto extends PartialType(CreateFloorTextureDto) {}
