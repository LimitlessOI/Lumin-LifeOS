/**
 * SYNOPSIS: Exports createWhiteLabelRoutes — routes/white-label-routes.js.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import express from 'express';

const BOOLEAN_FIELDS = ['hide_tiers', 'hide_models', 'hide_costs', 'hide_architecture'];
const TEXT_FIELDS = ['api_response_format', 'brand_name', 'custom_domain', 'custom_logo'];
const UUID_FIELDS = ['client_id'];

function asTrimmedString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function normalizeBooleanField(body, field) {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return null;
  return parseBoolean(body[field]);
}

function sanitizeCouncilResponse(result) {
  if (result && typeof result === 'object') {
    if (Object.prototype.hasOwnProperty.call(result, 'response')) return result.response;
    if (Object.prototype.hasOwnProperty.call(result, 'content')) return result.content;
    if (Object.prototype.hasOwnProperty.call(result, 'output')) return result.output;
    if (Object.prototype.hasOwnProperty.call(result, 'data')) return result.data;
  }
  return result ?? null;
}

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

  router.post('/api/v1/partner/onboard', requireKey, async (req, res, next) => {
    try {
      const body = req.body || {};
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const clientId = asTrimmedString(body.client_id);
      const brandName = asTrimmedString(body.brand_name);
      const customDomain = asTrimmedString(body.custom_domain);
      const customLogo = asTrimmedString(body.custom_logo);

      if (!clientId || !isUuid(clientId)) return res.status(400).json({ ok: false, error: 'client_id_required' });
      if (!brandName) return res.status(400).json({ ok: false, error: 'brand_name_required' });
      if (!customDomain) return res.status(400).json({ ok: false, error: 'custom_domain_required' });
      if (!customLogo) return res.status(400).json({ ok: false, error: 'custom_logo_required' });

      const aiSummary = await invokeCouncil(
        [
          'Summarize a white-label partner onboarding configuration for internal storage.',
          `client_id: ${clientId}`,
          `brand_name: ${brandName}`,
          `custom_domain: ${customDomain}`,
          `custom_logo: ${customLogo}`,
          'Return a concise normalized summary without internal reasoning.',
        ].join('\n'),
        'general',
      );

      const { rows } = await pool.query(
        `INSERT INTO partner_configurations
           (owner_id, client_id, brand_name, custom_domain, custom_logo, ai_summary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
         ON CONFLICT (client_id)
         DO UPDATE SET
           owner_id = EXCLUDED.owner_id,
           brand_name = EXCLUDED.brand_name,
           custom_domain = EXCLUDED.custom_domain,
           custom_logo = EXCLUDED.custom_logo,
           ai_summary = EXCLUDED.ai_summary,
           updated_at = NOW()
         RETURNING *`,
        [
          ownerId,
          clientId,
          brandName,
          customDomain,
          customLogo,
          JSON.stringify({ summary: aiSummary }),
        ],
      );

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'white-label onboard route failed');
      next(err);
    }
  });

  router.post('/api/v1/partner/configure', requireKey, async (req, res, next) => {
    try {
      const body = req.body || {};
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const missing = BOOLEAN_FIELDS.filter((field) => normalizeBooleanField(body, field) === null);
      if (missing.length) return res.status(400).json({ ok: false, error: `${missing[0]}_required` });

      const apiResponseFormat = asTrimmedString(body.api_response_format);
      if (!apiResponseFormat) return res.status(400).json({ ok: false, error: 'api_response_format_required' });

      const payload = {
        hide_tiers: normalizeBooleanField(body, 'hide_tiers'),
        hide_models: normalizeBooleanField(body, 'hide_models'),
        hide_costs: normalizeBooleanField(body, 'hide_costs'),
        hide_architecture: normalizeBooleanField(body, 'hide_architecture'),
        api_response_format: apiResponseFormat,
      };

      const aiSummary = await invokeCouncil(
        [
          'Normalize this white-label partner configuration for response shaping.',
          `hide_tiers: ${payload.hide_tiers}`,
          `hide_models: ${payload.hide_models}`,
          `hide_costs: ${payload.hide_costs}`,
          `hide_architecture: ${payload.hide_architecture}`,
          `api_response_format: ${payload.api_response_format}`,
          'Return a concise normalized summary without internal reasoning.',
        ].join('\n'),
        'general',
      );

      const { rows } = await pool.query(
        `INSERT INTO partner_configuration_settings
           (owner_id, hide_tiers, hide_models, hide_costs, hide_architecture, api_response_format, ai_summary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
         RETURNING *`,
        [
          ownerId,
          payload.hide_tiers,
          payload.hide_models,
          payload.hide_costs,
          payload.hide_architecture,
          payload.api_response_format,
          JSON.stringify({ summary: aiSummary }),
        ],
      );

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'white-label configure route failed');
      next(err);
    }
  });

  return router;
}

export { createWhiteLabelRoutes as registerWhiteLabelRoutes };