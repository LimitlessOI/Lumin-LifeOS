/**
 * SYNOPSIS: Registers TcImapRoutes routes/handlers (routes/tc-imap-routes.js).
 */
import { verifyImapAndDryRun } from '../services/imap-railway-bootstrap.js';

export function registerTcImapRoutes(app, deps) {
  const auth = deps?.requireAuth || deps?.requireKey;
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerTcImapRoutes requires an express app with get/post methods');
  }
  if (typeof verifyImapAndDryRun !== 'function') {
    throw new Error('imapRailwayBootstrap.verifyImapAndDryRun is unavailable');
  }

  const handler = async (req, res) => {
    try {
      const result = await verifyImapAndDryRun(deps, { force: req?.force === true });
      res.json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'TC IMAP route failed');
      res.status(500).json({
        ready: false,
        missing: error?.message || 'IMAP bootstrap verification failed'
      });
    }
  };

  app.get('/api/tc/imap/status', auth, async (req, res) => {
    try {
      const result = await verifyImapAndDryRun(deps);
      res.json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'TC IMAP status failed');
      res.status(500).json({
        ready: false,
        missing: error?.message || 'IMAP bootstrap verification failed'
      });
    }
  });

  app.post('/api/tc/imap/dry-run', auth, async (req, res) => {
    try {
      const result = await verifyImapAndDryRun(deps, { force: true });
      res.json(result);
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'TC IMAP dry-run failed');
      res.status(500).json({
        ready: false,
        missing: error?.message || 'IMAP dry-run failed'
      });
    }
  });
}

export default registerTcImapRoutes;