import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { BuildRouteToStoreQueryDto } from "./dto/build-route-to-store-query.dto";
import { BuildRouteToStoreResponseDto } from "./dto/build-route-to-store-response.dto";
import { BuildRouteQueryDto } from "./dto/build-route-query.dto";
import { BuildRouteResponseDto } from "./dto/build-route-response.dto";
import { RoutesService } from "./routes.service";

@ApiTags("public/routes")
@Controller("public/routes")
export class RoutesPublicController {
  constructor(private readonly routesService: RoutesService) {}

  @Get("build")
  @ApiOperation({
    summary:
      "Build route between two route nodes using active route graph. Supports emergencyMode for evacuation routing.",
  })
  @ApiOkResponse({ type: BuildRouteResponseDto })
  @ApiNotFoundResponse({
    description: "Route node, floor, or route path was not found.",
  })
  build(@Query() query: BuildRouteQueryDto): Promise<BuildRouteResponseDto> {
    return this.routesService.build(query);
  }

  @Get("to-store")
  @ApiOperation({
    summary: "Build route from a route node to selected active store.",
  })
  @ApiOkResponse({ type: BuildRouteToStoreResponseDto })
  @ApiBadRequestResponse({
    description: "Provide one of storeId, storeSlug or storeCode.",
  })
  @ApiNotFoundResponse({
    description: "Store, store route node, floor, or route path was not found.",
  })
  buildToStore(
    @Query() query: BuildRouteToStoreQueryDto,
  ): Promise<BuildRouteToStoreResponseDto> {
    return this.routesService.buildToStore(query);
  }
}