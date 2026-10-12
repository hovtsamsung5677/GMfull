import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { FloorPublicResponseDto } from "./dto/floor-public-response.dto";
import { FloorQueryDto } from "./dto/floor-query.dto";
import { FloorsService } from "./floors.service";

@ApiTags("public/floors")
@Controller("public/floors")
export class FloorsPublicController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @ApiOkResponse({ type: [FloorPublicResponseDto] })
  findAll(@Query() query: FloorQueryDto): Promise<FloorPublicResponseDto[]> {
    return this.floorsService.findPublic(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: FloorPublicResponseDto })
  findOne(@Param("id") id: string): Promise<FloorPublicResponseDto> {
    return this.floorsService.findPublicOne(id);
  }
}
