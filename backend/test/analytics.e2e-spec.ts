import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Analytics (e2e)', () => {
  let app: INestApplication;

  const analyticsServiceMock = {
    getOverview: jest.fn().mockResolvedValue({
      period: '7d',
      promptsTotal: 3,
      executionsTotal: 10,
      totalTokens: 1000,
      totalEstimatedCost: 0.5,
    }),
    getExecutionsPerDay: jest
      .fn()
      .mockResolvedValue([{ day: '2026-03-01', total: 2 }]),
    getCostPerModel: jest.fn().mockResolvedValue([
      {
        model: 'gpt-4o-mini',
        estimatedCost: 0.2,
        totalTokens: 400,
        avgLatencyMs: 800,
      },
    ]),
    getTopPrompts: jest
      .fn()
      .mockResolvedValue([{ promptId: 'p1', title: 'Top', executions: 5 }]),
    getAbHistory: jest.fn().mockResolvedValue([]),
    getAbRanking: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'dev-access-secret';
    process.env.JWT_REFRESH_SECRET = 'dev-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AnalyticsService)
      .useValue(analyticsServiceMock)
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

  it('GET /api/v1/analytics/overview com period', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/analytics/overview')
      .query({ period: '7d' })
      .set(authHeader())
      .expect(200);

    expect(analyticsServiceMock.getOverview).toHaveBeenCalledWith(
      'user-1',
      '7d',
    );
  });

  it('GET /api/v1/analytics/executions-per-day', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/analytics/executions-per-day')
      .query({ period: '30d' })
      .set(authHeader())
      .expect(200);

    expect(analyticsServiceMock.getExecutionsPerDay).toHaveBeenCalledWith(
      'user-1',
      '30d',
    );
  });

  it('GET /api/v1/analytics/cost-per-model', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/analytics/cost-per-model')
      .set(authHeader())
      .expect(200);

    expect(analyticsServiceMock.getCostPerModel).toHaveBeenCalled();
  });

  it('GET /api/v1/analytics/top-prompts com limit', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/analytics/top-prompts')
      .query({ period: '90d', limit: 10 })
      .set(authHeader())
      .expect(200);

    expect(analyticsServiceMock.getTopPrompts).toHaveBeenCalledWith(
      'user-1',
      '90d',
      10,
    );
  });

  it('GET /api/v1/analytics/ab-history e ab-ranking', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/v1/analytics/ab-history')
      .set(authHeader())
      .expect(200);
    await request(server)
      .get('/api/v1/analytics/ab-ranking')
      .query({ limit: 5 })
      .set(authHeader())
      .expect(200);

    expect(analyticsServiceMock.getAbHistory).toHaveBeenCalled();
    expect(analyticsServiceMock.getAbRanking).toHaveBeenCalled();
  });

  it('GET /api/v1/analytics/overview sem token retorna 401', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/analytics/overview').expect(401);
  });
});
