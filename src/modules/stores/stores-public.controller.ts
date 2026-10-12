import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { StoreSearchQueryDto } from "./dto/store-search-query.dto";
import { StoreSearchResponseDto } from "./dto/store-search-response.dto";
import { StoreQueryDto } from "./dto/store-query.dto";
import { StoreResponseDto } from "./dto/store-response.dto";
import { StoresService } from "./stores.service";

@ApiTags("public/stores")
@Controller("public/stores")
export class StoresPublicController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOkResponse({ type: [StoreResponseDto] })
  findAll(@Query() query: StoreQueryDto): Promise<StoreResponseDto[]> {
    return this.storesService.findPublic(query);
  }

  @Get("search")
  @ApiOkResponse({ type: [StoreSearchResponseDto] })
  search(
    @Query() query: StoreSearchQueryDto,
  ): Promise<StoreSearchResponseDto[]> {
    return this.storesService.searchPublic(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: StoreResponseDto })
  findOne(@Param("id") id: string): Promise<StoreResponseDto> {
    return this.storesService.findPublicOne(id);
  }
}
