import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class JudgeExecutionDto {
  @ApiProperty()
  @IsUUID()
  executionId!: string;

  @ApiProperty()
  @IsUUID()
  criteriaId!: string;

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  judgeModel?: string;
}
