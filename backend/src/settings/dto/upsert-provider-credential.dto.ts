import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpsertProviderCredentialDto {
  @ApiProperty({ enum: ProviderType })
  @IsEnum(ProviderType, { message: i18nValidationMessage('validation.isEnum') })
  provider!: ProviderType;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(10, { message: i18nValidationMessage('validation.minLength') })
  apiKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  organizationId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  isActive?: boolean;
}
