import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from '../common/interfaces/auth-user.interface';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthUser }>();
    const method = req.method;
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }
    const routeUnknown: unknown = req.route;
    let routePath: string | undefined;
    if (
      routeUnknown !== null &&
      typeof routeUnknown === 'object' &&
      'path' in routeUnknown
    ) {
      const rawPath = (routeUnknown as { path: unknown }).path;
      routePath = typeof rawPath === 'string' ? rawPath : undefined;
    }
    const path =
      (typeof routePath === 'string' ? routePath : '') ||
      req.path ||
      req.url ||
      '';
    if (
      path.includes('webhooks/stripe') ||
      path.includes('refresh') ||
      path.includes('login') ||
      path.includes('register')
    ) {
      return next.handle();
    }

    const userId = req.user?.sub;
    const action: AuditAction =
      method === 'POST'
        ? AuditAction.create
        : method === 'DELETE'
          ? AuditAction.delete
          : AuditAction.update;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService.log({
            userId: userId ?? null,
            action,
            resource: `${method} ${path}`,
            metadata: {
              params: req.params,
              query: req.query,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
          });
        },
      }),
    );
  }
}
