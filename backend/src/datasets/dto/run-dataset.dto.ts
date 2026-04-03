import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RunDatasetDto {
  @ApiPropertyOptional({
    description: 'Specific provider credential ID for executions',
  })
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional({
    description:
      'Optional evaluation criteria (LLM judge) applied to each successful execution',
  })
  @IsOptional()
  @IsUUID()
  criteriaId?: string;
}
