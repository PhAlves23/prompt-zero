import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Lucas Silva' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'lucas@promptvault.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
