import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PublicPromotionQueryDto } from './dto/public-promotion-query.dto';
import { PublicPromotionResponseDto } from './dto/public-promotion-response.dto';
import { PromotionsService } from './promotions.service';

const PUBLIC_ACTIVITY_DESCRIPTION =
  'Returns only promotions linked to both a store and a tenant. The promotion must have isActive=true, deletedAt=null, startsAt absent or not later than current UTC time, and endsAt absent or strictly later than current UTC time. endsAt is an exclusive boundary. The linked store must be active and visible, and the linked tenant must be active.';

@ApiTags('public/promotions')
@Controller('public/promotions')
export class PromotionsPublicController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List current public promotions',
    description: PUBLIC_ACTIVITY_DESCRIPTION,
  })
  @ApiOkResponse({ type: [PublicPromotionResponseDto] })
  @ApiBadRequestResponse({
    description: 'Invalid storeId or pagination value.',
  })
  findAll(
    @Query() query: PublicPromotionQueryDto,
  ): Promise<PublicPromotionResponseDto[]> {
    return this.promotionsService.findPublic(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get one current public promotion by slug',
    description: PUBLIC_ACTIVITY_DESCRIPTION,
  })
  @ApiParam({ name: 'slug', description: 'Public promotion slug, not an id.' })
  @ApiOkResponse({ type: PublicPromotionResponseDto })
  @ApiNotFoundResponse({
    description:
      'Promotion does not exist or is not currently public because of status, dates, store or tenant state.',
  })
  findOne(@Param('slug') slug: string): Promise<PublicPromotionResponseDto> {
    return this.promotionsService.findPublicOne(slug);
  }
}
