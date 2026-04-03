import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthController } from './google-auth.controller';
import { GithubAuthController } from './github-auth.controller';
import { SamlStubController } from './saml-stub.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { GithubStrategy } from './github.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { getEnvSecret } from '../common/utils/env.util';
import { PrismaModule } from '../prisma/prisma.module';

const googleOAuthEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

const githubOAuthEnabled =
  Boolean(process.env.GITHUB_CLIENT_ID) &&
  Boolean(process.env.GITHUB_CLIENT_SECRET);

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getEnvSecret(
          configService,
          'JWT_ACCESS_SECRET',
          'dev-access-secret',
        ),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    SamlStubController,
    ...(googleOAuthEnabled ? [GoogleAuthController] : []),
    ...(githubOAuthEnabled ? [GithubAuthController] : []),
  ],
  exports: [AuthService],
  providers: [
    AuthService,
    JwtStrategy,
    ...(googleOAuthEnabled ? [GoogleStrategy] : []),
    ...(githubOAuthEnabled ? [GithubStrategy] : []),
  ],
})
export class AuthModule {}
