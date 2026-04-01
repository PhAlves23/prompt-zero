import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreatePromptDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(3, { message: i18nValidationMessage('validation.minLength') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  description?: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(10, { message: i18nValidationMessage('validation.minLength') })
  content!: string;

  @ApiProperty({ enum: Language, default: Language.pt })
  @IsEnum(Language, { message: i18nValidationMessage('validation.isEnum') })
  language: Language = Language.pt;

  @ApiProperty({ example: 'gpt-4o-mini' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  model!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  isPublic?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  isTemplate?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.isArray') })
  @IsString({
    each: true,
    message: i18nValidationMessage('validation.isStringEach'),
  })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  workspaceId?: string;
}
