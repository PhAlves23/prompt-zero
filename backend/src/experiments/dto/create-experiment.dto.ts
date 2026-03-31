import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateExperimentDto {
  @ApiProperty()
  @IsString()
  promptAId!: string;

  @ApiProperty()
  @IsString()
  promptBId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  sampleSizeTarget?: number;

  @ApiPropertyOptional({
    description: 'Percentual de tráfego para variante A (B = 100 - A)',
    minimum: 1,
    maximum: 99,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  trafficSplitA?: number;
}
