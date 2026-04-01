import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { structuredLoggerMiddleware } from './common/middleware/structured-logger.middleware';
import { initTracing } from './observability/tracing';
import { logger } from './observability/logger';

console.log('='.repeat(60));
console.log('🚀 PromptZero Backend - Starting...');
console.log('='.repeat(60));
console.log('Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  PORT:', process.env.PORT || 'not set');
console.log(
  '  DATABASE_URL:',
  process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING',
);
console.log(
  '  JWT_ACCESS_SECRET:',
  process.env.JWT_ACCESS_SECRET ? '✅ SET' : '❌ MISSING',
);
console.log(
  '  JWT_REFRESH_SECRET:',
  process.env.JWT_REFRESH_SECRET ? '✅ SET' : '❌ MISSING',
);
console.log(
  '  ENCRYPTION_SECRET:',
  process.env.ENCRYPTION_SECRET ? '✅ SET' : '❌ MISSING',
);
console.log('  TRACING_ENABLED:', process.env.TRACING_ENABLED || 'not set');
console.log('='.repeat(60));

const tracingEnabled = process.env.TRACING_ENABLED === 'true';
if (tracingEnabled) {
  console.log('📡 Initializing OpenTelemetry tracing...');
  logger.info('Initializing OpenTelemetry tracing...');
  initTracing();
  console.log('✅ OpenTelemetry tracing initialized');
}

async function bootstrap() {
  try {
    console.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule);
    console.log('✅ NestJS application created');

    console.log('⚙️  Getting ConfigService...');
    const configService = app.get(ConfigService);
    console.log('✅ ConfigService obtained');

    if (configService.get<string>('NODE_ENV') === 'production') {
      console.log('🔒 Validating required secrets for production...');
      const requiredSecrets = [
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'ENCRYPTION_SECRET',
        'DATABASE_URL',
      ];
      for (const key of requiredSecrets) {
        if (!configService.get<string>(key)) {
          console.error(`❌ Required environment variable is missing: ${key}`);
          throw new Error(`Required environment variable is missing: ${key}`);
        }
        console.log(`  ✅ ${key} is set`);
      }
      console.log('✅ All required secrets validated');
    }

    console.log('🔧 Configuring application...');
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    console.log('✅ API prefix and versioning configured');

    console.log('🌐 Enabling CORS...');
    app.enableCors({
      origin: configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      ),
      credentials: true,
    });
    console.log('✅ CORS enabled');

    console.log('🛡️  Setting up global pipes and filters...');
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
    console.log('✅ Global pipes and filters configured');

    console.log('📚 Setting up Swagger documentation...');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PromptZero API')
      .setDescription('PromptZero backend API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      jsonDocumentUrl: 'api/docs-json',
    });
    console.log('✅ Swagger documentation configured');

    const port = configService.get<number>('PORT', 3001);
    console.log(`🚀 Starting server on port ${port}...`);
    await app.listen(port);

    const env = configService.get<string>('NODE_ENV');
    console.log('='.repeat(60));
    console.log('✅ APPLICATION STARTED SUCCESSFULLY!');
    console.log(`📍 Port: ${port}`);
    console.log(`🌍 Environment: ${env}`);
    console.log(`🔭 Tracing: ${tracingEnabled ? 'enabled' : 'disabled'}`);
    console.log('='.repeat(60));

    logger.info(`Application is running on port ${port}`, {
      environment: env,
      tracingEnabled,
    });
  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ FATAL ERROR DURING BOOTSTRAP');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error(
      'Stack:',
      error instanceof Error ? error.stack : 'No stack trace',
    );
    console.error('='.repeat(60));
    process.exit(1);
  }
}
void bootstrap();
