/**
 * Request ID Tracer
 * Attaches a unique request ID to every request and response.
 * Enables tracing a specific request through all log lines.
 * Usage: app.use(requestTracer(logger))
 */
import { randomUUID } from 'crypto';

export function requestTracer(logger) {
  const logSuccessfulRequests = process.env.LIFEOS_LOG_REQUESTS === 'true';

  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    const { method, url, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      // Skip health check spam
      if (url === '/healthz' || url === '/api/health') return;

      if (statusCode >= 500) {
        logger.error('[REQ]', { requestId, method, url, statusCode, duration, ip });
      } else if (statusCode >= 400) {
        logger.warn('[REQ]', { requestId, method, url, statusCode, duration, ip });
      } else if (logSuccessfulRequests) {
        logger.info('[REQ]', { requestId, method, url, statusCode, duration, ip });
      }
    });

    next();
  };
}
