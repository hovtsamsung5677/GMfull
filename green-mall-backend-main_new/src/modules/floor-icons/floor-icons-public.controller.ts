import {
  Get,
  Query,
  Controller,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FloorIconsService } from './floor-icons.service';
import { FloorIconResponseDto } from './dto/floor-icon-response.dto';

@ApiTags('public/floor-icons')
@Controller('public/floor-icons')
export class FloorIconsPublicController {
  constructor(private readonly service: FloorIconsService) {}

  @Get()
  @ApiOperation({ summary: 'List active floor icons by floor.' })
  @ApiOkResponse({ type: [FloorIconResponseDto] })
  findByFloor(@Query('floorId') floorId?: string): Promise<FloorIconResponseDto[]> {
    return this.service.findAll({ floorId });
  }
}
