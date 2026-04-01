import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateExperimentDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  promptAId!: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  promptBId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  sampleSizeTarget?: number;

  @ApiPropertyOptional({
    description: 'Percentual de tráfego para variante A (B = 100 - A)',
    minimum: 1,
    maximum: 99,
    default: 50,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(99, { message: i18nValidationMessage('validation.max') })
  trafficSplitA?: number;
}
