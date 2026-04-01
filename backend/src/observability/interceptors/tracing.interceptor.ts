/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const request = executionContext.switchToHttp().getRequest();
    const tracer = trace.getTracer('promptzero-backend');

    const span = tracer.startSpan(
      `${request.method} ${request.route?.path || request.url}`,
      {
        attributes: {
          'http.method': request.method,
          'http.url': request.url,
          'http.route': request.route?.path,
          'http.request_id': request.headers['x-request-id'],
          'user.id': request.user?.id,
        },
      },
    );

    return context.with(trace.setSpan(context.active(), span), () => {
      return next.handle().pipe(
        tap({
          next: () => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
          },
          error: (error) => {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.recordException(error);
            span.end();
          },
        }),
      );
    });
  }
}
