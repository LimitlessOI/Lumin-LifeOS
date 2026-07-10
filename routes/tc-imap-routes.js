/**
 * SYNOPSIS: Registers TcImapRoutes routes/handlers (routes/tc-imap-routes.js).
 */
import { imapRailwayBootstrap } from '../services/imap-railway-bootstrap.js';

async function verifyHandler(req, res) {
  try {
    const result = await imapRailwayBootstrap.verifyImapAndDryRun(req.app?.locals?.deps || req.deps || {});
    res.json(result);
  } catch (error) {
    req.app?.locals?.deps?.logger?.error?.({ error }, 'tc imap status route failed');
    res.status(502).json({ ready: false, error: 'HTTP 502' });
  }
}

async function dryRunHandler(req, res) {
  try {
    const result = await imapRailwayBootstrap.verifyImapAndDryRun(req.app?.locals?.deps || req.deps || {}, { force: true });
    res.json(result);
  } catch (error) {
    req.app?.locals?.deps?.logger?.error?.({ error }, 'tc imap dry-run route failed');
    res.status(502).json({ ready: false, error: 'HTTP 502' });
  }
}

export function registerTcImapRoutes(app, deps = {}) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerTcImapRoutes requires an Express app');
  }

  app.locals = app.locals || {};
  app.locals.deps = deps;

  const auth = deps.requireAuth || deps.requireKey;

  app.get('/api/tc/imap/status', auth || ((req, res, next) => next()), verifyHandler);
  app.post('/api/tc/imap/dry-run', auth || ((req, res, next) => next()), dryRunHandler);
}

export default registerTcImapRoutes;