/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Registers PendingAdamRoutes routes/handlers (routes/pending-adam-routes.js).
 */
import { getPendingAdam, resolveAdamItem } from '../services/pending-adam-service.js';

export function registerPendingAdamRoutes(app, { db, pool } = {}) {
  const pg = db || pool;
  app.get('/api/v1/lifeos/command-center/pending-adam', async (req, res) => {
    try {
      const items = await getPendingAdam(pg, { limit: req.query.limit });
      const count = items.length;
      const fetched_at = new Date().toISOString();
      res.json({ items, count, fetched_at });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending Adam items', detail: String(error?.message || error) });
    }
  });

  app.post('/api/v1/lifeos/command-center/pending-adam/:id/resolve', async (req, res) => {
    const { id } = req.params;
    const { resolved_by } = req.body;

    if (!id || id.length !== 36) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
      const resolvedRecord = await resolveAdamItem(pg, id, resolved_by);
      res.json(resolvedRecord);
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve Adam item', detail: String(error?.message || error) });
    }
  });
}