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
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Workspaces (e2e)', () => {
  let app: INestApplication;

  const workspacesServiceMock = {
    findAll: jest
      .fn()
      .mockResolvedValue([{ id: 'w1', name: 'Default', isDefault: true }]),
    create: jest.fn().mockResolvedValue({
      id: 'w-new',
      name: 'Growth',
      userId: 'user-1',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'w1',
      name: 'Atualizado',
    }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'dev-access-secret';
    process.env.JWT_REFRESH_SECRET = 'dev-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WorkspacesService)
      .useValue(workspacesServiceMock)
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

  it('GET /api/v1/workspaces lista workspaces', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/workspaces')
      .set(authHeader())
      .expect(200);

    expect(workspacesServiceMock.findAll).toHaveBeenCalledWith('user-1');
  });

  it('POST /api/v1/workspaces cria workspace', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/workspaces')
      .set(authHeader())
      .send({
        name: 'Growth',
        description: 'Marketing',
        color: '#10b981',
      })
      .expect(201);

    expect(workspacesServiceMock.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'Growth' }),
    );
  });

  it('PATCH /api/v1/workspaces/:id atualiza workspace', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/workspaces/w1')
      .set(authHeader())
      .send({ name: 'Atualizado' })
      .expect(200);

    expect(workspacesServiceMock.update).toHaveBeenCalledWith(
      'user-1',
      'w1',
      expect.objectContaining({ name: 'Atualizado' }),
    );
  });

  it('DELETE /api/v1/workspaces/:id remove workspace', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .delete('/api/v1/workspaces/w2')
      .set(authHeader())
      .expect(200);

    expect(workspacesServiceMock.remove).toHaveBeenCalledWith('user-1', 'w2');
  });

  it('GET /api/v1/workspaces sem token retorna 401', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/workspaces').expect(401);
  });

  it('PATCH retorna 404 quando serviço lança NotFoundException', async () => {
    workspacesServiceMock.update.mockImplementationOnce(() => {
      throw new NotFoundException('errors.workspaceNotFound');
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/workspaces/missing')
      .set(authHeader())
      .send({ name: 'Nome válido' })
      .expect(404);
  });
});
