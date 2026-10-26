import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: 'clx0000000000000000000000' })
  id!: string;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
