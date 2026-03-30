import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VariableType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateVariableInputDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: VariableType, default: VariableType.text })
  @IsEnum(VariableType)
  type: VariableType = VariableType.text;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class SyncTemplateVariablesDto {
  @ApiProperty({ type: [TemplateVariableInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableInputDto)
  variables!: TemplateVariableInputDto[];
}
