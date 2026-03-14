/**
 * Global Error Boundary
 * Catches any unhandled Express errors and returns safe JSON responses.
 * Never exposes stack traces in production.
 * Register LAST: app.use(errorBoundary(logger))
 */

export function errorBoundary(logger) {
  // Express error handler requires 4 params — do not remove `next`
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const requestId = req.requestId || 'unknown';
    const status = err.status || err.statusCode || 500;

    logger.error('[ERROR]', {
      requestId,
      message: err.message,
      status,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });

    // Never expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development';
    res.status(status).json({
      error: status < 500 ? err.message : 'Internal server error',
      requestId,
      ...(isDev && { stack: err.stack }),
    });
  };
}
