import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import type { IncomingMessage } from 'http';

export function initTracing() {
  const tempoUrl = process.env.TEMPO_ENDPOINT || 'http://localhost:4318';
  const prometheusUrl =
    process.env.PROMETHEUS_OTLP_ENDPOINT || 'http://localhost:4318';
  const serviceName = process.env.SERVICE_NAME || 'promptzero-backend';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  const traceExporter = new OTLPTraceExporter({
    url: `${tempoUrl}/v1/traces`,
    headers: {},
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${prometheusUrl}/v1/metrics`,
    headers: {},
  });

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-net': {
          enabled: false,
        },
      }),
      new HttpInstrumentation({
        requestHook: (span, request) => {
          const incomingMessage = request as IncomingMessage;
          if (incomingMessage.headers) {
            const requestId = incomingMessage.headers['x-request-id'];
            if (requestId) {
              span.setAttribute('http.request.id', requestId);
            }
          }
        },
      }),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}
