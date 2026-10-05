import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: 'clx0000000000000000000000' })
  id!: string;

  @ApiProperty({ example: 'admin@greenmall.local' })
  email!: string;

  @ApiPropertyOptional({ example: 'Super Admin', nullable: true })
  fullName!: string | null;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  role!: string;
}
