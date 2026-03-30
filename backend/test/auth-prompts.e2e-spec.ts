import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PromptsService } from '../src/prompts/prompts.service';

describe('Auth + Prompts (e2e)', () => {
  let app: INestApplication;

  const authServiceMock = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }),
    refresh: jest.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }),
    me: jest.fn().mockResolvedValue({
      id: 'user-1',
      name: 'User Test',
      email: 'user@test.com',
    }),
  };

  const promptsServiceMock = {
    create: jest.fn().mockResolvedValue({
      id: 'prompt-1',
      title: 'Prompt teste',
      version: 1,
    }),
    findAll: jest.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    findOne: jest.fn().mockResolvedValue({
      id: 'prompt-1',
      title: 'Prompt teste',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'prompt-1',
      title: 'Prompt atualizado',
    }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .overrideProvider(PromptsService)
      .useValue(promptsServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).post('/api/v1/auth/register').send({
      name: 'User Test',
      email: 'user@test.com',
      password: 'Password@123',
    });
    expect(authServiceMock.register).toHaveBeenCalled();
  });

  it('CRUD /api/v1/prompts com Bearer token', async () => {
    const token = sign(
      { sub: 'user-1', email: 'user@test.com' },
      'dev-access-secret',
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/v1/prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Prompt teste',
        content: 'Conteúdo de prompt válido com mais de 10 caracteres.',
        language: 'pt',
        model: 'gpt-4o-mini',
      })
      .expect(201);

    await request(server)
      .get('/api/v1/prompts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(server)
      .patch('/api/v1/prompts/prompt-1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Prompt atualizado',
      })
      .expect(200);

    await request(server)
      .delete('/api/v1/prompts/prompt-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
