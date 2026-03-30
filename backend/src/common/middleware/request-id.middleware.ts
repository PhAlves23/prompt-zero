import { randomUUID } from 'crypto';
import { NextFunction, Response } from 'express';
import { RequestWithContext } from '../interfaces/request-context.interface';

export function requestIdMiddleware(
  request: RequestWithContext,
  response: Response,
  next: NextFunction,
) {
  const headerValue = request.header('x-request-id');
  const requestId =
    headerValue && headerValue.length > 0 ? headerValue : randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
