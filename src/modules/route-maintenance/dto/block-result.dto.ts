import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BlockStateDto {
  @ApiProperty()
  blocked!: boolean;

  @ApiPropertyOptional({ nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  blockedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  blockedUntil!: string | null;
}

export class BlockEdgeResultDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fromNodeId!: string;

  @ApiProperty()
  toNodeId!: string;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ type: BlockStateDto })
  block!: BlockStateDto;
}

export class BlockNodeResultDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ type: BlockStateDto })
  block!: BlockStateDto;
}