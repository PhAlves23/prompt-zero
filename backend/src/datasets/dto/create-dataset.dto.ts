import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DatasetRowInputDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  variables!: Record<string, string>;
}

export class CreateDatasetDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [DatasetRowInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetRowInputDto)
  rows!: DatasetRowInputDto[];
}
