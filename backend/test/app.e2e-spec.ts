import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request, { Response as SupertestResponse } from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('/api/v1 (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    return request(server).get('/api/v1').expect(200).expect({
      status: 'ok',
      service: 'prompt-vault-backend',
      message: 'API is healthy',
    });
  });

  it('metrics endpoint (GET)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    let response: SupertestResponse | undefined;
    const candidates = ['/metrics', '/api/metrics', '/api/v1/metrics'];
    for (const path of candidates) {
      const candidate = await request(server).get(path);
      if (candidate.status === 200) {
        response = candidate;
        break;
      }
    }

    expect(response?.status).toBe(200);
    expect(response?.headers['content-type']).toContain('text/plain');
    expect(response?.text).toContain('http_requests_total');
  });
});
