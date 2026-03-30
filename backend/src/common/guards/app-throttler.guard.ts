import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    if (await super.shouldSkip(context)) {
      return true;
    }

    const { req } = this.getRequestResponse(context);
    const metricsPath = process.env.METRICS_PATH ?? '/metrics';
    const normalizedMetricsPath = metricsPath.startsWith('/')
      ? metricsPath
      : `/${metricsPath}`;
    const requestPath = String(req.path ?? req.url ?? '').split('?')[0];

    return requestPath === normalizedMetricsPath;
  }
}
