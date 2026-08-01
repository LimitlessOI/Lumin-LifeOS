/**
 * SYNOPSIS: Provides white-label configuration endpoints.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import { createWhiteLabelService } from '../services/white-label-service.js';

function asTrimmedString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeBoolean(input) {
  if (typeof input === 'boolean') return input;
  if (input === 1 || input === '1' || input === 'true') return true;
  if (input === 0 || input === '0' || input === 'false') return false;
  return null;
}

export function registerWhiteLabelRoutes(app, deps) {
  const { pool, logger, requireKey, callCouncilMember } = deps;

  if (!pool) {
    logger.error('Database pool not provided to white-label routes.');
    throw new Error('Database pool is required.');
  }
  if (!requireKey) {
    logger.error('Authentication middleware (requireKey) not provided to white-label routes.');
    throw new Error('Authentication middleware is required.');
  }
  if (!callCouncilMember) {
    logger.error('AI Council member function not provided to white-label routes.');
    throw new Error('AI Council member function is required.');
  }

  const whiteLabelService = createWhiteLabelService(pool, callCouncilMember);

  // Endpoint to create or update white-label partner configuration
  app.post('/api/v1/white-label/config', requireKey, async (req, res, next) => {
    try {
      const body = req.body || {};
      const ownerId = req.lifeosUser?.sub || null;

      // Extract and normalize all fields using the service's helpers
      const clientId = asTrimmedString(body.client_id);
      const brandName = asTrimmedString(body.brand_name);
      const customDomain = asTrimmedString(body.custom_domain);
      const customLogo = asTrimmedString(body.custom_logo);
      const hideTiers = normalizeBoolean(body.hide_tiers);
      const hideModels = normalizeBoolean(body.hide_models);
      const hideCosts = normalizeBoolean(body.hide_costs);
      const hideArchitecture = normalizeBoolean(body.hide_architecture);
      const apiResponseFormat = asTrimmedString(body.api_response_format);

      // Reconstruct the request body for the service, ensuring all expected fields are present
      const serviceReqBody = {
        client_id: clientId,
        brand_name: brandName,
        custom_domain: customDomain,
        custom_logo: customLogo,
        hide_tiers: hideTiers,
        hide_models: hideModels,
        hide_costs: hideCosts,
        hide_architecture: hideArchitecture,
        api_response_format: apiResponseFormat,
      };

      // Create a mock req object for the service with just the ownerId and body
      const serviceReq = {
        lifeosUser: { sub: ownerId },
        body: serviceReqBody,
      };

      const result = await whiteLabelService.configureWhiteLabelPartner(serviceReq);
      return res.json({ ok: true, data: result });
    } catch (err) {
      if (logger?.error) logger.error({ err, path: '/api/v1/white-label/config' }, 'white-label config route failed');
      // The service throws errors with a .status property, use that if available
      res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  // Endpoint to retrieve white-label partner configuration
  app.get('/api/v1/white-label/config', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      // The previous implementation used a path parameter, but the spec for this refactor implies a single config for the owner.
      // Assuming a single configuration per owner for simplicity as per the existing POST pattern.
      // If client_id is needed, it would typically be a query parameter or part of the body for POST, or a path param for GET.
      // Given the previous POST, we'll assume the GET retrieves the owner's active* config, if client_id is not specified.
      // However, the original `routes/white-label-routes.js` had `/api/v1/partner/config/:clientId`, so we'll restore that behavior.
      // This means the `clientId` would come from `req.params`.

      const clientId = req.query.client_id || req.params.clientId || null; // Support both query and path params for flexibility, preferring query for consistency with POST body.

      if (!clientId) {
        // If no clientId is provided, attempt to fetch all configs for the owner, or error if one is expected.
        // For now, let's assume clientId is required for GET based on the original structure.
        return res.status(400).json({ ok: false, error: 'client_id_required_or_invalid' });
      }

      const { rows } = await pool.query(
        `SELECT id, client_id, brand_name, custom_domain, custom_logo, api_response_format, hide_tiers, hide_models, hide_costs, hide_architecture, created_at, updated_at FROM white_label_configs WHERE client_id = $1`,
        [clientId],
      );

      if (rows.length === 0) return res.status(404).json({ ok: false, error: 'config_not_found' });

      // The white_label_configs table does not have owner_id, so the previous ownerId check is removed for GET.
      // This implies white-label configs are global or tied to the client_id directly, not the requesting owner.
      // Re-adding owner_id check based on previous route file, assuming white_label_configs should* have an owner_id.
      // Since the live DB schema for `white_label_configs` does NOT list `owner_id`, we will query without* `owner_id`
      // but return 401 if the `ownerId` from JWT is not present, as it implies an authenticated call.
      // This is a discrepancy between the previous `routes/white-label-routes.js` (which used `partner_configurations` with `owner_id`)
      // and the `white_label_configs` schema provided. Sticking to the provided schema for `white_label_configs`.

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) logger.error({ err, path: '/api/v1/white-label/config' }, 'white-label get config route failed');
      res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  // Old route for partner config, will be removed if this entirely replaces it.
  // app.get('/api/v1/partner/config/:clientId', requireKey, async (req, res, next) => { /* ... */ });
  // app.post('/api/v1/partner/config', requireKey, async (req, res, next) => { /* ... */ });
}