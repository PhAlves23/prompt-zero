import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxTokens?: number;
}

export class ComparePromptDto {
  @ApiProperty()
  @IsUUID()
  promptId!: string;

  @ApiProperty({ type: [CompareVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompareVariantDto)
  variants!: CompareVariantDto[];
}
