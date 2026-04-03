import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProviderType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CompareVariantDto {
  @ApiProperty()
  @IsString()
  model!: string;

  @ApiPropertyOptional({ enum: ProviderType })
  @IsOptional()
  @IsEnum(ProviderType)
  provider?: ProviderType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  topK?: number;
}

export class ComparePromptDto {
  @ApiProperty()
  @IsUUID()
  promptId!: string;

  @ApiPropertyOptional({
    description: 'Template variable values applied to every variant',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiProperty({ type: [CompareVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompareVariantDto)
  variants!: CompareVariantDto[];
}
