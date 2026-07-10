/**
 * SYNOPSIS: Exports registerTcImapRoutes — routes/tc-imap-routes.js.
 */
import imapRailwayBootstrap from '../services/imap-railway-bootstrap.js';

function getAuthMiddleware(deps) {
  return deps?.requireAuth || deps?.requireKey;
}

function sendError(res, statusCode, message, details) {
  const payload = { error: message };
  if (details !== undefined) payload.details = details;
  return res.status(statusCode).json(payload);
}

export async function registerTcImapRoutes(app, deps = {}) {
  const requireAuth = getAuthMiddleware(deps);

  app.get('/api/tc/imap/status', requireAuth, async (req, res) => {
    try {
      const result = await imapRailwayBootstrap.verifyImapAndDryRun(deps);
      return res.json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'tc-imap status failed');
      return sendError(res, 500, 'imap_status_failed');
    }
  });

  app.post('/api/tc/imap/dry-run', requireAuth, async (req, res) => {
    try {
      const result = await imapRailwayBootstrap.verifyImapAndDryRun(deps, { forceDryRun: true });
      return res.json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'tc-imap dry-run failed');
      return sendError(res, 500, 'imap_dry_run_failed');
    }
  });
}

export default registerTcImapRoutes;