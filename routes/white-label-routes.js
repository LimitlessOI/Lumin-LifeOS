import express from 'express';

/**
 * SYNOPSIS: Exports createWhiteLabelRoutes — routes/white-label-routes.js.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
export function createWhiteLabelRoutes(app, ctx = {}) {
  const { pool, logger } = ctx;
  const requireKey = ctx.requireKey || ctx.rk || ((_req, res) => {
    res.status(503).json({ ok: false, error: 'auth_middleware_unavailable' });
  });
  const callCouncilMember = ctx.callCouncilMember || ctx.callCouncilWithFailover;
  const router = express.Router();

  async function invokeCouncil(prompt, taskType = 'general') {
    if (typeof callCouncilMember !== 'function') {
      const err = new Error('council_member_unavailable');
      err.status = 503;
      throw err;
    }
    const result = await callCouncilMember('openai', prompt, { taskType });
    return sanitizeCouncilResponse(result);
  }

  // Endpoint to create or update white-label partner configuration
  router.post('/api/v1/partner/config', requireKey, async (req, res, next) => {
    try {
      const body = req.body || {};
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const clientId = asTrimmedString(body.client_id);
      const brandName = asTrimmedString(body.brand_name);
      const customDomain = asTrimmedString(body.custom_domain);
      const customLogo = asTrimmedString(body.custom_logo);
      const apiResponseFormat = asTrimmedString(body.api_response_format);

      const hideTiers = normalizeBooleanField(body, 'hide_tiers');
      const hideModels = normalizeBooleanField(body, 'hide_models');
      const hideCosts = normalizeBooleanField(body, 'hide_costs');
      const hideArchitecture = normalizeBooleanField(body, 'hide_architecture');

      // Validate required fields for initial setup
      if (!clientId || !isUuid(clientId)) return res.status(400).json({ ok: false, error: 'client_id_required' });
      if (!brandName) return res.status(400).json({ ok: false, error: 'brand_name_required' });
      if (!customDomain) return res.status(400).json({ ok: false, error: 'custom_domain_required' });
      if (!customLogo) return res.status(400).json({ ok: false, error: 'custom_logo_required' });
      if (!apiResponseFormat) return res.status(400).json({ ok: false, error: 'api_response_format_required' });

      const configPayload = {
        client_id: clientId,
        brand_name: brandName,
        custom_domain: customDomain,
        custom_logo: customLogo,
        api_response_format: apiResponseFormat,
        hide_tiers: hideTiers,
        hide_models: hideModels,
        hide_costs: hideCosts,
        hide_architecture: hideArchitecture,
      };

      const aiSummary = await invokeCouncil(
        [ 'Summarize this white-label partner configuration for internal storage and response shaping.',
          ...Object.entries(configPayload).map(([key, value]) => `${key}: ${value}`),
          'Return a concise normalized summary without internal reasoning.'
        ].join('\n'),
        'general',
      );

      const { rows } = await pool.query(
        `INSERT INTO partner_configurations
           (owner_id, client_id, brand_name, custom_domain, custom_logo, api_response_format, hide_tiers, hide_models, hide_costs, hide_architecture, ai_summary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW(), NOW())
         ON CONFLICT (client_id)
         DO UPDATE SET
           owner_id = EXCLUDED.owner_id,
           brand_name = EXCLUDED.brand_name,
           custom_domain = EXCLUDED.custom_domain,
           custom_logo = EXCLUDED.custom_logo,
           api_response_format = EXCLUDED.api_response_format,
           hide_tiers = EXCLUDED.hide_tiers,
           hide_models = EXCLUDED.hide_models,
           hide_costs = EXCLUDED.hide_costs,
           hide_architecture = EXCLUDED.hide_architecture,
           ai_summary = EXCLUDED.ai_summary,
           updated_at = NOW()
         RETURNING *`,
        [
          ownerId,
          clientId,
          brandName,
          customDomain,
          customLogo,
          apiResponseFormat,
          hideTiers,
          hideModels,
          hideCosts,
          hideArchitecture,
          JSON.stringify({ summary: aiSummary }),
        ],
      );

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'white-label config route failed');
      next(err);
    }
  });

  // Endpoint to retrieve white-label partner configuration
  router.get('/api/v1/partner/config/:clientId', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { clientId } = req.params;
      if (!clientId || !isUuid(clientId)) return res.status(400).json({ ok: false, error: 'invalid_client_id' });

      const { rows } = await pool.query(
        `SELECT * FROM partner_configurations WHERE owner_id = $1 AND client_id = $2`,
        [ownerId, clientId],
      );

      if (rows.length === 0) return res.status(404).json({ ok: false, error: 'config_not_found' });

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'white-label get config route failed');
      next(err);
    }
  });

  return router;
}

export function registerWhiteLabelRoutes(app, ctx) {
  const router = createWhiteLabelRoutes(app, ctx);
  app.use(router);
}
