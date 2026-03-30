import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  HTTP_REQUEST_DURATION_METRIC,
  HTTP_REQUESTS_TOTAL_METRIC,
} from './metrics.constants';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUESTS_TOTAL_METRIC)
    private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric(HTTP_REQUEST_DURATION_METRIC)
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      route?: { path?: string };
      path?: string;
    }>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const endedAt = process.hrtime.bigint();
        const durationSeconds = Number(endedAt - startedAt) / 1_000_000_000;
        const route = request.route?.path ?? request.path ?? 'unknown';
        const labels = {
          method: request.method,
          route,
          status_code: String(response.statusCode ?? 500),
        };

        this.httpRequestsTotal.inc(labels);
        this.httpRequestDuration.observe(labels, durationSeconds);
      }),
    );
  }
}
