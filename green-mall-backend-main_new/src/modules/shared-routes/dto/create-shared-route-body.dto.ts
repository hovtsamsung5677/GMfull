import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class CreateSharedRouteBodyDto {
  @IsNotEmpty()
  payload!: unknown;

  @ApiPropertyOptional({
    description: 'TTL in minutes before the link expires.',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60 * 24 * 7)
  ttlMinutes?: number;
}
