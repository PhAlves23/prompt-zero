import { MinioService } from './minio/minio.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';

config();

async function testMinioConnection() {
  const logger = new Logger('MinioTest');

  const configService = new ConfigService();
  const minioService = new MinioService(configService);

  try {
    logger.log('Testing MinIO connection...');

    await minioService.onModuleInit();

    logger.log('✅ MinIO connection successful!');
    logger.log(
      `✅ Bucket "${configService.get('MINIO_BUCKET_NAME')}" is ready`,
    );

    process.exit(0);
  } catch (error) {
    logger.error('❌ MinIO connection failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testMinioConnection().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
