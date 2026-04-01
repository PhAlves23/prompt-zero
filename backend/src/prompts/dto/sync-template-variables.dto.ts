import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VariableType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class TemplateVariableInputDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(100, { message: i18nValidationMessage('validation.maxLength') })
  name!: string;

  @ApiProperty({ enum: VariableType, default: VariableType.text })
  @IsEnum(VariableType, { message: i18nValidationMessage('validation.isEnum') })
  type: VariableType = VariableType.text;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  defaultValue?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.isArray') })
  @IsString({
    each: true,
    message: i18nValidationMessage('validation.isStringEach'),
  })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(255, { message: i18nValidationMessage('validation.maxLength') })
  description?: string;
}

export class SyncTemplateVariablesDto {
  @ApiProperty({ type: [TemplateVariableInputDto] })
  @IsArray({ message: i18nValidationMessage('validation.isArray') })
  @ValidateNested({
    each: true,
    message: i18nValidationMessage('validation.validateNested'),
  })
  @Type(() => TemplateVariableInputDto)
  variables!: TemplateVariableInputDto[];
}
