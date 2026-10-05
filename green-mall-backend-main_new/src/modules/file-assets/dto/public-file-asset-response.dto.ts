import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileAssetKind } from '@prisma/client';

export class PublicFileAssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiPropertyOptional({ nullable: true })
  originalName!: string | null;

  @ApiProperty({ description: 'Frontend-accessible URL of the file.' })
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'File size in bytes.' })
  size!: number | null;

  @ApiPropertyOptional({ nullable: true })
  provider!: string | null;

  @ApiProperty({ enum: FileAssetKind })
  kind!: FileAssetKind;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
