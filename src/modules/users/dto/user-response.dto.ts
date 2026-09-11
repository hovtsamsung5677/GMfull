import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserRoleResponseDto {
  @ApiProperty({ example: 'clx0000000000000000000000' })
  id!: string;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
}

export class UserResponseDto {
  @ApiProperty({ example: 'clx0000000000000000000000' })
  id!: string;

  @ApiProperty({ example: 'admin@greenmall.local' })
  email!: string;

  @ApiPropertyOptional({ example: 'Super Admin', nullable: true })
  fullName!: string | null;

  @ApiPropertyOptional({ example: '+79990000000', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: UserRoleResponseDto })
  role!: UserRoleResponseDto;

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
