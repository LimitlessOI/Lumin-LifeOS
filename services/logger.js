/**
 * Structured logger — Pino (5-10x faster than Winston, native JSON for Railway)
 *
 * Usage:
 *   import logger from './services/logger.js';
 *   logger.info('Server started', { port: 8080 });
 *   logger.error('Pipeline failed', { error: err.message, pipelineId });
 *   logger.warn('Budget threshold hit', { spend: 4.20, limit: 5.00 });
 *
 * Child loggers (per module):
 *   const log = logger.child({ module: 'idea-engine' });
 *   log.info('Generated 10 ideas');
 *
 * In production (Railway): outputs newline-delimited JSON — searchable/alertable.
 * In development: outputs colorized human-readable via pino-pretty.
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  // Dev: pretty-print with colors. Prod: raw JSON for Railway log aggregator.
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },

  // Base metadata on every log line
  base: {
    service: 'lifeos',
    env: process.env.NODE_ENV || 'development',
  },

  // Redact secrets — never log these fields even if accidentally passed
  redact: {
    paths: ['*.apiKey', '*.api_key', '*.token', '*.password', '*.secret', '*.COMMAND_CENTER_KEY'],
    censor: '[REDACTED]',
  },
});

export default logger;
