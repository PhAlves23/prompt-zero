import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Max, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  period?: string;
}

export class CacheAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por workspace (opcional)',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  workspaceId?: string;
}

export class TopPromptsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ default: 5 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(20, { message: i18nValidationMessage('validation.max') })
  limit = 5;
}
