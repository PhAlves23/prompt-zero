import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithContext } from '../interfaces/request-context.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    if (typeof payload === 'string') {
      message = payload;
    } else if (payload && typeof payload === 'object' && 'message' in payload) {
      const payloadMessage = payload.message;
      if (Array.isArray(payloadMessage)) {
        message = payloadMessage
          .filter((item): item is string => typeof item === 'string')
          .join(', ');
      } else if (typeof payloadMessage === 'string') {
        message = payloadMessage;
      }
    } else if (exception instanceof Error) {
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'Internal server error' : exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      code: status,
      message,
      path: request.url,
      requestId: request.requestId ?? null,
      timestamp: new Date().toISOString(),
    });
  }
}
