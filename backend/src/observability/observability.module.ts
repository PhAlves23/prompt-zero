import { Module, Global } from '@nestjs/common';
import { ObservabilityService } from './observability.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TracingInterceptor } from './interceptors/tracing.interceptor';

@Global()
@Module({
  providers: [
    ObservabilityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
