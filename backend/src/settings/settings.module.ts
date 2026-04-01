import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [UsersModule, PrismaModule, ConfigModule, MinioModule],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
