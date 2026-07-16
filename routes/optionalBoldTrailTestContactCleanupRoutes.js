/**
 * SYNOPSIS: Optional BoldTrail test contact cleanup routes stub.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

import { cleanupTestContacts } from '../services/optionalBoldTrailTestContactCleanupService.js';

export function registerOptionalBoldTrailTestContactCleanupRoutes(app, ctx = {}) {
  const { requireKey, pool } = ctx;
  const auth = requireKey || ((_req, res) => res.status(503).json({ ok: false, error: 'auth_middleware_unavailable' }));

  app.delete('/api/v1/lifeos/boldtrail/testcontacts/cleanup', auth, async (req, res) => {
    try {
      const { confirm, ...rest } = req.body || {};
      const result = await cleanupTestContacts({ pool, confirm: confirm !== false, ...rest });
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}
