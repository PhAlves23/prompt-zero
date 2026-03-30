import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { structuredLoggerMiddleware } from './common/middleware/structured-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  if (configService.get<string>('NODE_ENV') === 'production') {
    const requiredSecrets = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_SECRET',
      'DATABASE_URL',
    ];
    for (const key of requiredSecrets) {
      if (!configService.get<string>(key)) {
        throw new Error(`Required environment variable is missing: ${key}`);
      }
    }
  }

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(requestIdMiddleware);
  app.use(structuredLoggerMiddleware);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PromptZero API')
    .setDescription('PromptZero backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.listen(configService.get<number>('PORT', 3001));
}
void bootstrap();
