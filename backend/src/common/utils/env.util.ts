import { ConfigService } from '@nestjs/config';

export function getEnvSecret(
  configService: ConfigService,
  key: string,
  devFallback: string,
): string {
  const value = configService.get<string>(key);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (isProduction && !value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }

  return value ?? devFallback;
}
