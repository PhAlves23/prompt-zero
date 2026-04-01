import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateWorkspaceDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(2, { message: i18nValidationMessage('validation.minLength') })
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  description?: string;

  @ApiProperty({ example: '#6366F1' })
  @IsHexColor({ message: i18nValidationMessage('validation.isHexColor') })
  color!: string;
}
