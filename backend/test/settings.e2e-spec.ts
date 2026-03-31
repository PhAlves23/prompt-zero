import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { SettingsService } from '../src/settings/settings.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Settings / users (e2e)', () => {
  let app: INestApplication;

  const settingsServiceMock = {
    updateProfile: jest
      .fn()
      .mockResolvedValue({ id: 'user-1', name: 'Novo Nome' }),
    updateApiKeys: jest.fn().mockResolvedValue({
      openaiConfigured: true,
      anthropicConfigured: false,
      providers: [],
    }),
    getApiKeysStatus: jest.fn().mockResolvedValue({
      openaiConfigured: true,
      anthropicConfigured: false,
      providers: [
        {
          id: 'cred-1',
          provider: 'openai',
          label: 'Main',
          baseUrl: null,
          organizationId: null,
          isDefault: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }),
    listProviderCredentials: jest.fn().mockResolvedValue([]),
    upsertProviderCredential: jest.fn().mockResolvedValue({
      id: 'cred-new',
      provider: 'openai',
      label: 'default',
      hasApiKey: true,
    }),
    removeProviderCredential: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'dev-access-secret';
    process.env.JWT_REFRESH_SECRET = 'dev-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SettingsService)
      .useValue(settingsServiceMock)
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

  const authHeader = () => {
    const token = sign(
      { sub: 'user-1', email: 'user@test.com' },
      'dev-access-secret',
    );
    return { Authorization: `Bearer ${token}` };
  };

  it('PATCH /api/v1/users/profile atualiza perfil', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/users/profile')
      .set(authHeader())
      .send({ name: 'Novo Nome' })
      .expect(200);

    expect(settingsServiceMock.updateProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'Novo Nome' }),
    );
  });

  it('GET /api/v1/users/api-keys retorna status', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/users/api-keys')
      .set(authHeader())
      .expect(200);

    expect(settingsServiceMock.getApiKeysStatus).toHaveBeenCalledWith('user-1');
  });

  it('GET /api/v1/users/provider-credentials lista credenciais', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/users/provider-credentials')
      .set(authHeader())
      .expect(200);

    expect(settingsServiceMock.listProviderCredentials).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('POST /api/v1/users/provider-credentials cria credencial', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/users/provider-credentials')
      .set(authHeader())
      .send({
        provider: 'openai',
        label: 'default',
        apiKey: 'sk-test-key-min-10',
        isDefault: true,
        isActive: true,
      })
      .expect(201);

    expect(settingsServiceMock.upsertProviderCredential).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        provider: 'openai',
        apiKey: 'sk-test-key-min-10',
      }),
    );
  });

  it('PATCH /api/v1/users/provider-credentials/:id atualiza credencial', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/users/provider-credentials/cred-1')
      .set(authHeader())
      .send({
        provider: 'openai',
        label: 'rotated',
        apiKey: 'sk-new-key-min-10',
        isDefault: false,
        isActive: true,
      })
      .expect(200);

    expect(settingsServiceMock.upsertProviderCredential).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ label: 'rotated' }),
      'cred-1',
    );
  });

  it('DELETE /api/v1/users/provider-credentials/:id remove credencial', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .delete('/api/v1/users/provider-credentials/cred-1')
      .set(authHeader())
      .expect(200);

    expect(settingsServiceMock.removeProviderCredential).toHaveBeenCalledWith(
      'user-1',
      'cred-1',
    );
  });

  it('rotas de users sem token retornam 401', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/users/api-keys').expect(401);
  });

  it('PATCH credencial inexistente retorna 404', async () => {
    settingsServiceMock.upsertProviderCredential.mockImplementationOnce(() => {
      throw new NotFoundException('errors.providerCredentialNotFound');
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/users/provider-credentials/bad-id')
      .set(authHeader())
      .send({
        provider: 'openai',
        label: 'x',
        apiKey: 'sk-invalid-10',
        isDefault: false,
        isActive: true,
      })
      .expect(404);
  });
});
