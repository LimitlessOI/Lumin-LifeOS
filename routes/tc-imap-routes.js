/**
 * SYNOPSIS: TC IMAP status + dry-run routes.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { verifyImapAndDryRun } from '../services/imap-railway-bootstrap.js';

function getAuthMiddleware(deps) {
  return deps?.requireAuth || deps?.requireKey || null;
}

export function registerTcImapRoutes(app, deps = {}) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerTcImapRoutes requires an Express app');
  }

  const requireAuth = getAuthMiddleware(deps);
  if (typeof requireAuth !== 'function') {
    throw new Error('registerTcImapRoutes requires deps.requireAuth or deps.requireKey');
  }

  app.get('/api/tc/imap/status', requireAuth, async (_req, res) => {
    try {
      const result = await verifyImapAndDryRun(deps);
      res.status(200).json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'tc imap status failed');
      res.status(500).json({
        ready: false,
        missing: ['imap_bootstrap_verification_failed'],
        error: 'imap_bootstrap_verification_failed',
      });
    }
  });

  app.post('/api/tc/imap/dry-run', requireAuth, async (_req, res) => {
    try {
      const result = await verifyImapAndDryRun(deps, { forceDryRun: true });
      res.status(200).json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'tc imap dry-run failed');
      res.status(500).json({
        ready: false,
        missing: ['imap_bootstrap_dry_run_failed'],
        error: 'imap_bootstrap_dry_run_failed',
      });
    }
  });
}

export default registerTcImapRoutes;
