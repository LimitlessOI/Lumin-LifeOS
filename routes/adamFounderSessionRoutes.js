/**
 * SYNOPSIS: Adam founder session routes stub.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

import { startFounderSession } from '../services/adamFounderSessionService.js';

export function registerAdamFounderSessionRoutes(app, ctx = {}) {
  const { requireKey } = ctx;
  const auth = requireKey || ((_req, res) => res.status(503).json({ ok: false, error: 'auth_middleware_unavailable' }));

  app.post('/api/v1/lifeos/founder/session', auth, async (req, res) => {
    try {
      const userId = req.lifeosUser?.sub || req.body?.user_id;
      const result = await startFounderSession({ userId, metadata: req.body?.metadata || {} });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.delete('/api/v1/lifeos/founder/session', auth, async (req, res) => {
    res.json({ ok: true, session_ended_at: new Date().toISOString() });
  });
}
