import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomBytes } from 'crypto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const port = parseInt(
      this.configService.get<string>('MINIO_PORT', '9000'),
      10,
    );
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.getOrThrow<string>('MINIO_ROOT_USER');
    const secretKey = this.configService.getOrThrow<string>(
      'MINIO_ROOT_PASSWORD',
    );

    this.bucketName =
      this.configService.getOrThrow<string>('MINIO_BUCKET_NAME');
    this.publicUrl = this.configService.getOrThrow<string>('MINIO_PUBLIC_URL');

    const cleanEndpoint = endpoint
      .replace(/^https?:\/\//, '')
      .replace(/:\d+$/, '');

    this.logger.log(
      `Initializing MinIO - Endpoint: ${cleanEndpoint}, Port: ${port} (type: ${typeof port}), SSL: ${useSSL}, AccessKey: ${accessKey?.substring(0, 8)}...`,
    );

    this.minioClient = new Minio.Client({
      endPoint: cleanEndpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
      region: 'us-east-1',
      pathStyle: true,
    });

    this.logger.log(`MinIO client initialized successfully`);
  }

  async onModuleInit() {
    try {
      await this.ensureBucketExists();
    } catch (error) {
      this.logger.error(
        `Failed to initialize MinIO: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.warn(
        'MinIO is not available. Avatar upload functionality will not work.',
      );
      // Don't throw - allow the app to start even if MinIO is unavailable
    }
  }

  private async ensureBucketExists(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Attempting to connect to MinIO (attempt ${attempt}/${maxRetries})...`,
        );

        const exists = await this.minioClient.bucketExists(this.bucketName);
        if (!exists) {
          this.logger.log(`Creating bucket: ${this.bucketName}`);
          await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
          this.logger.log(`Bucket ${this.bucketName} created successfully`);
        } else {
          this.logger.log(`Bucket ${this.bucketName} already exists`);
        }

        // Tentar configurar política pública para avatars (não crítico)
        try {
          const readOnlyPolicy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucketName}/avatars/*`],
              },
            ],
          };

          await this.minioClient.setBucketPolicy(
            this.bucketName,
            JSON.stringify(readOnlyPolicy),
          );
          this.logger.log(
            `Public read policy set for ${this.bucketName}/avatars/*`,
          );
        } catch (policyError) {
          this.logger.warn(
            `Could not set bucket policy (non-critical): ${policyError instanceof Error ? policyError.message : String(policyError)}`,
          );
        }

        // Connection successful
        this.logger.log('MinIO connection successful');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `MinIO connection attempt ${attempt}/${maxRetries} failed: ${lastError.message}`,
        );

        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.log(`Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    this.logger.error(
      `Failed to connect to MinIO after ${maxRetries} attempts: ${lastError?.message}`,
    );
    throw lastError || new Error('Failed to connect to MinIO');
  }

  async uploadAvatar(
    file: Buffer,
    userId: string,
    originalName: string,
  ): Promise<{ fileName: string; url: string }> {
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString('hex');
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `avatars/${userId}/${timestamp}-${randomString}.${extension}`;

    const metadata = {
      'Content-Type': this.getContentType(extension),
      'Cache-Control': 'public, max-age=31536000',
    };

    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        file,
        file.length,
        metadata,
      );

      const url = this.getPublicUrl(fileName);

      this.logger.log(`Avatar uploaded successfully: ${fileName}`);
      return { fileName, url };
    } catch (error) {
      this.logger.error(
        `Error uploading avatar: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to upload avatar');
    }
  }

  async deleteAvatar(fileName: string): Promise<void> {
    if (!fileName || !fileName.startsWith('avatars/')) {
      this.logger.warn(`Invalid file name for deletion: ${fileName}`);
      return;
    }

    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
      this.logger.log(`Avatar deleted successfully: ${fileName}`);
    } catch (error) {
      this.logger.error(
        `Error deleting avatar: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getPublicUrl(fileName: string): string {
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    return `${protocol}://${this.publicUrl}/${this.bucketName}/${fileName}`;
  }

  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  async listUserAvatars(userId: string): Promise<string[]> {
    const prefix = `avatars/${userId}/`;
    const objectsList: string[] = [];

    try {
      const stream = this.minioClient.listObjects(
        this.bucketName,
        prefix,
        true,
      );

      for await (const obj of stream) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (obj.name) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          objectsList.push(obj.name as string);
        }
      }

      return objectsList;
    } catch (error) {
      this.logger.error(
        `Error listing user avatars: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async deleteOldAvatars(userId: string, keepFileName?: string): Promise<void> {
    const avatars = await this.listUserAvatars(userId);

    const filesToDelete = avatars.filter((file) => file !== keepFileName);

    if (filesToDelete.length > 0) {
      this.logger.log(
        `Deleting ${filesToDelete.length} old avatar(s) for user ${userId}`,
      );

      await Promise.all(
        filesToDelete.map((file) =>
          this.minioClient.removeObject(this.bucketName, file),
        ),
      );
    }
  }
}
