import { ApiProperty } from '@nestjs/swagger';
import { ExperimentVariant } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VoteExperimentDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  exposureId!: string;

  @ApiProperty({ enum: ExperimentVariant })
  @IsEnum(ExperimentVariant, {
    message: i18nValidationMessage('validation.isEnum'),
  })
  winnerVariant!: ExperimentVariant;
}
