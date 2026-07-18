/**
 * SYNOPSIS: Registers CreativeEngineGraphicDesignRoutes routes/handlers (routes/creative-engine-graphic-design-routes.js).
 */
import runGraphicDesign, { estimateGraphicDesignCost } from '../services/creative-engine/modes/graphic-design.js';

export function registerCreativeEngineGraphicDesignRoutes(app, deps = {}) {
  const { requireKey, logger } = deps;

  if (!requireKey) {
    throw new Error('registerCreativeEngineGraphicDesignRoutes requires requireKey');
  }

  app.post('/api/v1/creative/graphic-design/estimate', requireKey, (req, res) => {
    try {
      const result = estimateGraphicDesignCost(req.body || {});
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/creative/graphic-design/render', requireKey, async (req, res) => {
    try {
      const job = {
        request_json: req.body || {},
        owner_id: req.body?.owner_id || req.query?.owner_id || 'anon',
      };

      const result = await runGraphicDesign({ job, logger });

      if (result?.gated === true) {
        return res.status(503).json(result);
      }

      if (result?.ok === false) {
        return res.status(422).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger?.error?.('[CREATIVE-GRAPHIC-DESIGN] render failed', { error: error.message });
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  logger?.info?.('Creative Engine graphic-design routes registered at /api/v1/creative/graphic-design/*');
}

export default registerCreativeEngineGraphicDesignRoutes;