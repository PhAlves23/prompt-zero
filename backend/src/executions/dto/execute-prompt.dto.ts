import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ExecutePromptDto {
  @ApiPropertyOptional({ enum: ProviderType })
  @IsOptional()
  @IsEnum(ProviderType)
  provider?: ProviderType;

  @ApiPropertyOptional({
    description: 'Specific provider credential ID',
  })
  @IsOptional()
  @IsString()
  credentialId?: string;

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
    description: 'Template placeholder values, e.g. {"product":"PromptZero"}',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
