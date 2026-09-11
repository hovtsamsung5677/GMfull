import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FloorQueryDto } from './dto/floor-query.dto';
import { FloorResponseDto } from './dto/floor-response.dto';
import { FloorsService } from './floors.service';

@ApiTags('public/floors')
@Controller('public/floors')
export class FloorsPublicController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @ApiOkResponse({ type: [FloorResponseDto] })
  findAll(@Query() query: FloorQueryDto): Promise<FloorResponseDto[]> {
    return this.floorsService.findPublic(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: FloorResponseDto })
  findOne(@Param('id') id: string): Promise<FloorResponseDto> {
    return this.floorsService.findPublicOne(id);
  }
}
