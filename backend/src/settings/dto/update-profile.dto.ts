import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProfileDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(2, { message: i18nValidationMessage('validation.minLength') })
  name!: string;
}
