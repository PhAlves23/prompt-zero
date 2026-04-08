import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CacheStatsQueryDto {
  @ApiPropertyOptional({
    example: '7d',
    description: 'Período (ex.: 7d, 30d, 90d)',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  period?: string;
}
