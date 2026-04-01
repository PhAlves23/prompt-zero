import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateApiKeysDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(10, { message: i18nValidationMessage('validation.minLength') })
  openaiApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(10, { message: i18nValidationMessage('validation.minLength') })
  anthropicApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(10, { message: i18nValidationMessage('validation.minLength') })
  googleApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(10, { message: i18nValidationMessage('validation.minLength') })
  openrouterApiKey?: string;
}
