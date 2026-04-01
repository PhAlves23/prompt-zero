import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @ApiProperty({ example: 'lucas@promptvault.com' })
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  email!: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(8, { message: i18nValidationMessage('validation.minLength') })
  password!: string;
}
