import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  HTTP_REQUEST_DURATION_METRIC,
  HTTP_REQUESTS_TOTAL_METRIC,
} from './metrics.constants';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

function normalizeMetricsPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

@Module({
  imports: [
    PrometheusModule.register({
      path: normalizeMetricsPath(process.env.METRICS_PATH ?? '/metrics'),
      defaultLabels: {
        service: 'promptzero-backend',
        env: process.env.NODE_ENV ?? 'development',
      },
      defaultMetrics: {
        enabled: (process.env.METRICS_ENABLED ?? 'true') !== 'false',
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: HTTP_REQUESTS_TOTAL_METRIC,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION_METRIC,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
