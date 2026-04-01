import { ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListPromptsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(20, { message: i18nValidationMessage('validation.max') })
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  search?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language, { message: i18nValidationMessage('validation.isEnum') })
  language?: Language;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  model?: string;

  @ApiPropertyOptional({ description: 'Boolean string: true|false' })
  @IsOptional()
  @IsBooleanString({
    message: i18nValidationMessage('validation.isBooleanString'),
  })
  isPublic?: string;

  @ApiPropertyOptional({ description: 'Boolean string: true|false' })
  @IsOptional()
  @IsBooleanString({
    message: i18nValidationMessage('validation.isBooleanString'),
  })
  isFavorite?: string;

  @ApiPropertyOptional({ description: 'Boolean string: true|false' })
  @IsOptional()
  @IsBooleanString({
    message: i18nValidationMessage('validation.isBooleanString'),
  })
  isTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  workspaceId?: string;
}
