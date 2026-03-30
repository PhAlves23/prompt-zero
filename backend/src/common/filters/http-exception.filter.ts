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
import { I18nContext } from 'nestjs-i18n';

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

    let message = 'errors.internalServerError';
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
      message = isProduction ? 'errors.internalServerError' : exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    message = this.translateMessage(host, message);

    response.status(status).json({
      code: status,
      message,
      path: request.url,
      requestId: request.requestId ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  private translateMessage(host: ArgumentsHost, message: string): string {
    if (!message) {
      return message;
    }

    const i18n = I18nContext.current(host);
    if (!i18n) {
      return message;
    }

    if (!message.includes('.')) {
      return message;
    }

    const translated = i18n.t(message);
    if (typeof translated === 'string' && translated !== message) {
      return translated;
    }
    return message;
  }
}
