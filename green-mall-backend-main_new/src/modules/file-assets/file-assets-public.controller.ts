import { Controller, Get, Header, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PublicFileAssetResponseDto } from './dto/public-file-asset-response.dto';
import { FileAssetsService } from './file-assets.service';

@ApiTags('public/file-assets')
@Controller('public/file-assets')
export class FileAssetsPublicController {
  constructor(private readonly fileAssetsService: FileAssetsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get an active file asset for frontend rendering',
    description:
      'Returns only the public metadata of an active registered file. Internal storage fields and usage information are never exposed.',
  })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PublicFileAssetResponseDto })
  @ApiNotFoundResponse({ description: 'Active file asset not found.' })
  findOne(@Param('id') id: string): Promise<PublicFileAssetResponseDto> {
    return this.fileAssetsService.findPublicOne(id);
  }
}
