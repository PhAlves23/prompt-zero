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
import { TagsService } from '../src/tags/tags.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Tags (e2e)', () => {
  let app: INestApplication;

  const tagsServiceMock = {
    findAll: jest
      .fn()
      .mockResolvedValue([{ id: 't1', name: 'marketing', slug: 'marketing' }]),
    create: jest.fn().mockResolvedValue({
      id: 't-new',
      name: 'vendas',
      slug: 'vendas',
    }),
    update: jest.fn().mockResolvedValue({
      id: 't1',
      name: 'marketing-b2b',
    }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'dev-access-secret';
    process.env.JWT_REFRESH_SECRET = 'dev-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TagsService)
      .useValue(tagsServiceMock)
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

  it('GET /api/v1/tags lista tags', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/tags').set(authHeader()).expect(200);
    expect(tagsServiceMock.findAll).toHaveBeenCalledWith('user-1');
  });

  it('POST /api/v1/tags cria tag', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/tags')
      .set(authHeader())
      .send({ name: 'vendas', color: '#22c55e' })
      .expect(201);

    expect(tagsServiceMock.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'vendas' }),
    );
  });

  it('PATCH /api/v1/tags/:id atualiza tag', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/tags/t1')
      .set(authHeader())
      .send({ name: 'marketing-b2b' })
      .expect(200);

    expect(tagsServiceMock.update).toHaveBeenCalledWith(
      'user-1',
      't1',
      expect.objectContaining({ name: 'marketing-b2b' }),
    );
  });

  it('DELETE /api/v1/tags/:id remove tag', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .delete('/api/v1/tags/t1')
      .set(authHeader())
      .expect(200);

    expect(tagsServiceMock.remove).toHaveBeenCalledWith('user-1', 't1');
  });

  it('GET /api/v1/tags sem token retorna 401', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/tags').expect(401);
  });

  it('PATCH retorna 404 quando tag não existe', async () => {
    tagsServiceMock.update.mockImplementationOnce(() => {
      throw new NotFoundException('errors.tagNotFound');
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .patch('/api/v1/tags/missing')
      .set(authHeader())
      .send({ name: 'Nome válido', color: '#ffffff' })
      .expect(404);
  });
});
