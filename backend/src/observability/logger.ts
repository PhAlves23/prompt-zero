/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

export function createLogger() {
  const environment = process.env.NODE_ENV || 'development';
  const serviceName = process.env.SERVICE_NAME || 'promptzero-backend';
  const lokiUrl = process.env.LOKI_ENDPOINT;
  const lokiEnabled = process.env.LOKI_ENABLED === 'true' && !!lokiUrl;

  const defaultFormat = combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json(),
  );

  const consoleFormat =
    environment === 'development'
      ? combine(
          colorize(),
          timestamp({ format: 'HH:mm:ss' }),
          printf(({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
              msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
          }),
        )
      : defaultFormat;

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info',
    }),
  ];

  if (lokiEnabled) {
    transports.push(
      new LokiTransport({
        host: lokiUrl,
        labels: {
          service: serviceName,
          environment,
        },
        json: true,
        format: defaultFormat,
        replaceTimestamp: true,
        onConnectionError: (err) => {
          console.error('Loki connection error:', err);
        },
      }),
    );
  }

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: defaultFormat,
    defaultMeta: {
      service: serviceName,
      environment,
    },
    transports,
    exitOnError: false,
  });

  logger.info('Logger initialized', {
    lokiEnabled,
    environment,
    serviceName,
  });

  return logger;
}

export const logger = createLogger();
