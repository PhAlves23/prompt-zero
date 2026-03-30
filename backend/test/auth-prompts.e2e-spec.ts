import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PromptsService } from '../src/prompts/prompts.service';
import { ExecutionsService } from '../src/executions/executions.service';
import { ExploreService } from '../src/explore/explore.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

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
    getTemplateVariables: jest.fn().mockResolvedValue([]),
    syncTemplateVariables: jest.fn().mockResolvedValue([]),
    forkPrompt: jest.fn().mockResolvedValue({
      id: 'fork-1',
      title: 'Fork Prompt',
    }),
  };

  const executionsServiceMock = {
    executePrompt: jest.fn().mockResolvedValue({
      output: 'Resposta simulada',
      execution: { id: 'exec-1' },
      meta: {
        model: 'gpt-4o-mini',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 1200,
        estimatedCost: 0.0012,
      },
    }),
    listPromptExecutions: jest.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
  };

  const exploreServiceMock = {
    listPublicPrompts: jest.fn().mockResolvedValue({
      data: [{ id: 'public-1', title: 'Prompt público' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getPublicPrompt: jest.fn().mockResolvedValue({
      id: 'public-1',
      title: 'Prompt público',
    }),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'dev-access-secret';
    process.env.JWT_REFRESH_SECRET = 'dev-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .overrideProvider(PromptsService)
      .useValue(promptsServiceMock)
      .overrideProvider(ExecutionsService)
      .useValue(executionsServiceMock)
      .overrideProvider(ExploreService)
      .useValue(exploreServiceMock)
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
    app.useGlobalFilters(new HttpExceptionFilter());
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

  it('POST /api/v1/auth/register retorna 409 em conflito', async () => {
    authServiceMock.register.mockImplementationOnce(() => {
      throw new ConflictException('Email já está em uso');
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'User Test',
        email: 'user@test.com',
        password: 'Password@123',
      })
      .expect(409);
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

  it('retorna 401 ao acessar rota protegida sem token', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/prompts').expect(401);
  });

  it('retorna 403 quando serviço de prompt nega ownership', async () => {
    promptsServiceMock.update.mockImplementationOnce(() => {
      throw new ForbiddenException('Sem permissão para editar este prompt');
    });
    const token = sign(
      { sub: 'user-1', email: 'user@test.com' },
      'dev-access-secret',
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/prompts/prompt-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'sem-permissao' })
      .expect(403);
  });

  it('retorna 404 quando prompt não existe', async () => {
    promptsServiceMock.findOne.mockImplementationOnce(() => {
      throw new NotFoundException('Prompt não encontrado');
    });
    const token = sign(
      { sub: 'user-1', email: 'user@test.com' },
      'dev-access-secret',
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/prompts/prompt-not-found')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /api/v1/explore retorna prompts públicos sem auth', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/explore').expect(200);
  });

  it('GET /api/v1/prompts/:id/executions retorna histórico com auth', async () => {
    const token = sign(
      { sub: 'user-1', email: 'user@test.com' },
      'dev-access-secret',
    );
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/prompts/prompt-1/executions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
