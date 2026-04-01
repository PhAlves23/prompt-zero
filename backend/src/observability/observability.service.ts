/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import {
  trace,
  context,
  Span,
  SpanStatusCode,
  Tracer,
} from '@opentelemetry/api';
import { logger } from './logger';

@Injectable()
export class ObservabilityService {
  private readonly tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('promptzero-backend', '1.0.0');
  }

  startSpan(name: string, attributes?: Record<string, any>): Span {
    const span = this.tracer.startSpan(name, {
      attributes,
    });
    return span;
  }

  async executeInSpan<T>(
    spanName: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>,
  ): Promise<T> {
    const span = this.startSpan(spanName, attributes);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span),
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>,
  ) {
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    const logData = {
      ...metadata,
      ...(spanContext && {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      }),
    };

    logger[level](message, logData);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log('debug', message, metadata);
  }

  addSpanAttribute(key: string, value: any) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, any>) {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext()?.traceId;
  }

  getCurrentSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext()?.spanId;
  }
}
