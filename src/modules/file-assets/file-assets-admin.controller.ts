import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Inject,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFileAssetDto } from './dto/create-file-asset.dto';
import { FileAssetQueryDto } from './dto/file-asset-query.dto';
import { FileAssetResponseDto } from './dto/file-asset-response.dto';
import { UpdateFileAssetDto } from './dto/update-file-asset.dto';
import { FileAssetsService } from './file-assets.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileAssetKind } from '@prisma/client';
import {
  FILE_STORAGE_PROVIDER,
  FileStorageProviderInstance,
} from './storage/file-storage.interface';

interface UploadedMulterFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('admin/file-assets')
@ApiBearerAuth()
@Controller('admin/file-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER', 'ADS_MANAGER')
export class FileAssetsAdminController {
  constructor(
    private readonly fileAssetsService: FileAssetsService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProviderInstance,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List registered external file assets',
    description:
      'Returns metadata records and active usage counts. This API does not read or upload file contents.',
  })
  @ApiOkResponse({ type: [FileAssetResponseDto] })
  findAll(@Query() query: FileAssetQueryDto): Promise<FileAssetResponseDto[]> {
    return this.fileAssetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a registered file asset and its usage counts' })
  @ApiOkResponse({ type: FileAssetResponseDto })
  @ApiNotFoundResponse({ description: 'File asset not found.' })
  findOne(@Param('id') id: string): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Register an existing file by URL',
    description:
      'Creates only a FileAsset metadata record for an existing URL. It does not upload, copy or persist file contents.',
  })
  @ApiCreatedResponse({ type: FileAssetResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid file asset metadata or URL.' })
  create(
    @Body() dto: CreateFileAssetDto,
    @CurrentUser('id') uploadedById: string,
  ): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.create(dto, uploadedById ?? null);
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a file from local PC',
    description:
      'Accepts a multipart/form-data file upload, stores it through the configured storage provider (local disk or S3-compatible) and creates a FileAsset record.',
  })
  @ApiCreatedResponse({ type: FileAssetResponseDto })
  @ApiBadRequestResponse({ description: 'No file uploaded or invalid file.' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: UploadedMulterFile,
    @CurrentUser('id') uploadedById: string,
    @Body('kind') kind?: string,
  ): Promise<FileAssetResponseDto> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const stored = this.storageProvider.store({
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
    });

    const assetKind = Object.values(FileAssetKind).includes(kind as FileAssetKind)
      ? (kind as FileAssetKind)
      : FileAssetKind.OTHER;

    return stored.then(storedFile =>
      this.fileAssetsService.create(
        {
          filename: file.originalname,
          url: storedFile.url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: storedFile.path,
          provider: storedFile.provider,
          kind: assetKind,
          metadata: {},
        } as CreateFileAssetDto,
        uploadedById ?? null,
      ),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a registered file asset metadata record' })
  @ApiOkResponse({ type: FileAssetResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid file asset metadata or URL.' })
  @ApiNotFoundResponse({ description: 'File asset not found.' })
  @ApiConflictResponse({
    description:
      'isActive cannot be set to false while active entities or a current/scheduled promotion use the asset.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateFileAssetDto): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-deactivate an unused file asset',
    description: 'Sets isActive=false. The database record and external file are not deleted.',
  })
  @ApiOkResponse({ type: FileAssetResponseDto })
  @ApiNotFoundResponse({ description: 'File asset not found.' })
  @ApiConflictResponse({
    description: 'File asset is referenced by an active entity or a current/scheduled promotion.',
  })
  remove(@Param('id') id: string): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.remove(id);
  }
}
