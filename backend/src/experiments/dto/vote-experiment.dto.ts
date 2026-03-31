import { ApiProperty } from '@nestjs/swagger';
import { ExperimentVariant } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class VoteExperimentDto {
  @ApiProperty()
  @IsString()
  exposureId!: string;

  @ApiProperty({ enum: ExperimentVariant })
  @IsEnum(ExperimentVariant)
  winnerVariant!: ExperimentVariant;
}
