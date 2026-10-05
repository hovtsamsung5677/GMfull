import { PartialType } from '@nestjs/swagger';
import { CreateFloorIconDto } from './create-floor-icon.dto';

export class UpdateFloorIconDto extends PartialType(CreateFloorIconDto) {}
