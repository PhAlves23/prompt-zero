import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { i18nValidationMessage } from 'nestjs-i18n';

export class RunExperimentDto {
  @ApiPropertyOptional({
    example: 'gpt-4o-mini',
    description:
      'Opcional: se omitido, usa o modelo configurado no prompt sorteado na rodada.',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  model?: string;

  @ApiPropertyOptional({ enum: ProviderType })
  @IsOptional()
  @IsEnum(ProviderType, { message: i18nValidationMessage('validation.isEnum') })
  provider?: ProviderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  credentialId?: string;

  @ApiPropertyOptional({ default: 0.7 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.isNumber') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  @Max(2, { message: i18nValidationMessage('validation.max') })
  temperature?: number;

  @ApiPropertyOptional({ default: 512 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.isNumber') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(4000, { message: i18nValidationMessage('validation.max') })
  maxTokens?: number;

  @ApiPropertyOptional({ default: 0.95 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.isNumber') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  @Max(1, { message: i18nValidationMessage('validation.max') })
  topP?: number;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.isNumber') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(200, { message: i18nValidationMessage('validation.max') })
  topK?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ message: i18nValidationMessage('validation.isObject') })
  variables?: Record<string, string>;
}
