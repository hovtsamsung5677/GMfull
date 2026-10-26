import { PartialType } from '@nestjs/swagger';
import { CreateMapObjectDto } from './create-map-object.dto';

export class UpdateMapObjectDto extends PartialType(CreateMapObjectDto) {}
