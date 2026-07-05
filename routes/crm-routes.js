/**
 * SYNOPSIS: CRM interface routes — provider-agnostic surface over the active CrmProvider.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 *
 * Products/UI consume /api/v1/crm/* and never know which CRM sits behind it. Swapping the
 * provider (CRM_PROVIDER env) changes nothing here or for any caller.
 */
import { getCrmProvider, listCrmProviders } from '../services/crm-provider.js';
import { createCrmIntelligence } from '../services/crm-intelligence.js';

export function createCrmRoutes(app, ctx = {}) {
  const { requireKey, logger } = ctx;
  const guard = typeof requireKey === 'function' ? requireKey : (req, res, next) => next();

  app.get('/api/v1/crm/status', guard, async (req, res) => {
    try {
      const provider = getCrmProvider({ logger });
      const status = await provider.status();
      res.json({ ok: true, active_provider: provider.name, available_providers: listCrmProviders(), status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/crm/contacts', guard, async (req, res) => {
    try {
      const provider = getCrmProvider({ logger });
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const status = req.query.status != null && req.query.status !== '' ? req.query.status : null;
      const result = await provider.listContacts({ limit, status });
      res.json({ ok: result.ok, provider: provider.name, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/crm/segments', guard, async (req, res) => {
    try {
      const intel = createCrmIntelligence({ logger });
      const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
      const result = await intel.segments({ limit });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/crm/super-fans', guard, async (req, res) => {
    try {
      const intel = createCrmIntelligence({ logger });
      const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
      const top = Math.min(parseInt(req.query.top, 10) || 20, 100);
      const minScore = parseInt(req.query.minScore, 10);
      const result = await intel.superFans({
        limit,
        top,
        minScore: Number.isFinite(minScore) ? minScore : 45,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
}
