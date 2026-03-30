import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ExecutePromptDto {
  @ApiProperty({ example: 'gpt-4o-mini' })
  @IsString()
  model!: string;

  @ApiPropertyOptional({ default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ default: 512 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;

  @ApiPropertyOptional({
    description:
      'Valores para placeholders em templates, ex: {"produto":"PromptZero"}',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
