import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeaderBannerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle: string | null;

  @ApiPropertyOptional()
  linkUrl: string | null;

  @ApiPropertyOptional()
  asset: {
    id: string;
    filename: string;
    url: string;
    mimeType: string | null;
  } | null;

  @ApiPropertyOptional()
  targetStore: {
    id: string;
    name: string;
    slug: string;
  } | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  placement: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
