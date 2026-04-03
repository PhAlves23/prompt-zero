import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RunDatasetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentialId?: string;
}
