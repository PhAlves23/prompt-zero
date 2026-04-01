import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateTagDto {
  @ApiProperty({ example: 'Marketing' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(2, { message: i18nValidationMessage('validation.minLength') })
  @MaxLength(50, { message: i18nValidationMessage('validation.maxLength') })
  name!: string;

  @ApiProperty({ example: '#EF4444' })
  @IsHexColor({ message: i18nValidationMessage('validation.isHexColor') })
  color!: string;
}
