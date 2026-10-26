import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PanelStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class PanelHeartbeatDto {
  @ApiPropertyOptional({
    enum: PanelStatus,
    enumName: 'PanelStatus',
    description:
      'Optional runtime status reported by the panel. When omitted, the panel is marked ONLINE and its lastSeenAt/usedAt are refreshed.',
    example: PanelStatus.ONLINE,
  })
  @IsOptional()
  @IsEnum(PanelStatus)
  status?: PanelStatus;

  @ApiPropertyOptional({
    description:
      'Optional client application version. Stored as a best-effort label for diagnostics.',
    example: '1.4.2',
    maxLength: 120,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  appVersion?: string;
}

export class PanelHeartbeatResponseDto {
  @ApiProperty({ description: 'Panel identifier that was heart-beateed.' })
  id!: string;

  @ApiProperty({ enum: PanelStatus, enumName: 'PanelStatus' })
  status!: PanelStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Updated lastSeenAt value after the heartbeat.',
  })
  lastSeenAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Updated usedAt value when this heartbeat carried a PANEL_USED signal, otherwise unchanged.',
  })
  usedAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Server timestamp when the heartbeat was processed.',
  })
  processedAt!: Date;
}

export interface PanelStatusPayload {
  id: string;
  code: string;
  status: PanelStatus;
  lastSeenAt: Date | null;
  usedAt: Date | null;
  isActive: boolean;
}
