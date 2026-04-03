import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class TestWebhookDto {
  @ApiProperty({ example: 'execution.completed' })
  @IsString()
  event!: string;

  @ApiPropertyOptional({
    description: 'Payload opcional; se omitido, usa exemplo padrão do evento',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
