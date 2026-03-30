import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsString, MinLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Marketing' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '#EF4444' })
  @IsHexColor()
  color!: string;
}
