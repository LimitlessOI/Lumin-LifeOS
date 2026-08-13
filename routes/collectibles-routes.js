/**
 * SYNOPSIS: Collectibles capture/list route scaffold.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
import { createCollectibleTwin } from '../services/collectibles/twin-service.js';
import { createMtgCategoryAdapter } from '../services/collectibles/adapters/mtg-adapter.js';

/**
 * Register Collectibles API routes under /api/v1/collectibles.
 * @param {import('express').Application} app
 * @param {object} deps
 */
export function registerCollectiblesRoutes(app, deps = {}) {
  const auth = typeof deps.requireAuth === 'function' ? deps.requireAuth : (_req, _res, next) => next();
  const adapter = createMtgCategoryAdapter();

  app.post('/api/v1/collectibles', auth, async (req, res) => {
    try {
      const twin = createCollectibleTwin({
        ...(req.body || {}),
        category_id: (req.body && req.body.category_id) || 'mtg',
        adapter_id: (req.body && req.body.adapter_id) || 'mtg_v1',
        owner_user_id: req.user?.id || req.body?.owner_user_id || null,
      });
      res.status(201).json({ ok: true, twin, adapter_category: adapter.identify('__CATEGORY_ID_TEST_STRING__') });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/collectibles', auth, async (req, res) => {
    res.json({
      ok: true,
      twins: [],
      needs_review: req.query?.needs_review === 'true',
      note: 'list stub — persistence lands in a later slice',
    });
  });
}
