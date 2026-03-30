import { Logger } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { RequestWithContext } from '../interfaces/request-context.interface';

const logger = new Logger('HttpRequest');

export function structuredLoggerMiddleware(
  request: RequestWithContext,
  response: Response,
  next: NextFunction,
) {
  const start = Date.now();

  response.on('finish', () => {
    const logPayload = {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      userAgent: request.headers['user-agent'] ?? 'unknown',
      ip: request.ip,
    };
    logger.log(JSON.stringify(logPayload));
  });

  next();
}
