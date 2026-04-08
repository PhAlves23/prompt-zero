import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateCacheConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  cacheEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'TTL em segundos (60 a 2592000 = 30 dias)',
    minimum: 60,
    maximum: 2592000,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(60, { message: i18nValidationMessage('validation.min') })
  @Max(2592000, { message: i18nValidationMessage('validation.max') })
  cacheTtlSeconds?: number;
}
