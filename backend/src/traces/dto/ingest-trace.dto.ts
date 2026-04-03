import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class TraceSpanInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsISO8601()
  startTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class IngestTraceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: [TraceSpanInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TraceSpanInputDto)
  spans!: TraceSpanInputDto[];
}
