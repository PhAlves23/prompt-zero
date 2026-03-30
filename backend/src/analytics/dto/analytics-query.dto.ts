import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Max, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsOptional()
  @IsString()
  period?: string;
}

export class TopPromptsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ default: 5 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 5;
}
