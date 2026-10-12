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
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateFileAssetDto } from "./dto/create-file-asset.dto";
import { FileAssetQueryDto } from "./dto/file-asset-query.dto";
import { FileAssetResponseDto } from "./dto/file-asset-response.dto";
import { UpdateFileAssetDto } from "./dto/update-file-asset.dto";
import { FileAssetsService } from "./file-assets.service";
import { UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileAssetKind } from "@prisma/client";

interface UploadedMulterFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

@ApiTags("admin/file-assets")
@ApiBearerAuth()
@Controller("admin/file-assets")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "MALL_ADMIN", "CONTENT_MANAGER", "ADS_MANAGER")
export class FileAssetsAdminController {
  constructor(private readonly fileAssetsService: FileAssetsService) {}

  @Get()
  @ApiOperation({
    summary: "List registered external file assets",
    description:
      "Returns metadata records and active usage counts. This API does not read or upload file contents.",
  })
  @ApiOkResponse({ type: [FileAssetResponseDto] })
  findAll(@Query() query: FileAssetQueryDto): Promise<FileAssetResponseDto[]> {
    return this.fileAssetsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a registered file asset and its usage counts" })
  @ApiOkResponse({ type: FileAssetResponseDto })
  @ApiNotFoundResponse({ description: "File asset not found." })
  findOne(@Param("id") id: string): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: "Register an existing file by URL",
    description:
      "Creates only a FileAsset metadata record for an existing URL. It does not upload, copy or persist file contents.",
  })
  @ApiCreatedResponse({ type: FileAssetResponseDto })
  @ApiBadRequestResponse({ description: "Invalid file asset metadata or URL." })
  create(
    @Body() dto: CreateFileAssetDto,
    @CurrentUser("id") uploadedById: string,
  ): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.create(dto, uploadedById ?? null);
  }

  @Post("upload")
  @ApiOperation({
    summary: "Upload a file from local PC",
    description:
      "Accepts a multipart/form-data file upload, stores it in the public uploads directory, and creates a FileAsset record.",
  })
  @ApiCreatedResponse({ type: FileAssetResponseDto })
  @ApiBadRequestResponse({ description: "No file uploaded or invalid file." })
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile() file: UploadedMulterFile,
    @CurrentUser("id") uploadedById: string,
    @Body("kind") kind?: string,
  ): Promise<FileAssetResponseDto> {
    if (!file) {
      throw new Error("No file uploaded");
    }

    const url = `/uploads/${file.filename}`;
    const assetKind = Object.values(FileAssetKind).includes(
      kind as FileAssetKind,
    )
      ? (kind as FileAssetKind)
      : FileAssetKind.OTHER;

    return this.fileAssetsService.create(
      {
        filename: file.originalname,
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        kind: assetKind,
        metadata: {},
      },
      uploadedById ?? null,
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a registered file asset metadata record" })
  @ApiOkResponse({ type: FileAssetResponseDto })
  @ApiBadRequestResponse({ description: "Invalid file asset metadata or URL." })
  @ApiNotFoundResponse({ description: "File asset not found." })
  @ApiConflictResponse({
    description:
      "isActive cannot be set to false while active entities or a current/scheduled promotion use the asset.",
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFileAssetDto,
  ): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Soft-deactivate an unused file asset",
    description:
      "Sets isActive=false. The database record and external file are not deleted.",
  })
  @ApiOkResponse({ type: FileAssetResponseDto })
  @ApiNotFoundResponse({ description: "File asset not found." })
  @ApiConflictResponse({
    description:
      "File asset is referenced by an active entity or a current/scheduled promotion.",
  })
  remove(@Param("id") id: string): Promise<FileAssetResponseDto> {
    return this.fileAssetsService.remove(id);
  }
}
