import { Controller, Get } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HeaderBannersService } from './header-banners.service';
import { HeaderBannerResponseDto } from './dto/header-banner-response.dto';

@ApiTags('public/header-banners')
@Controller('public/header-banners')
export class HeaderBannersPublicController {
  constructor(private readonly headerBannersService: HeaderBannersService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get the active header banner' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  getActive(): Promise<HeaderBannerResponseDto> {
    return this.headerBannersService.findActivePublic();
  }
}
