/**
 * SYNOPSIS: LifeOS consent API — grant/revoke/status using createConsentRegistry.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createConsentRegistry, getConsentFeatures } from '../services/consent-registry.js';

function getRequesterId(req) {
  const user = req.user || req.auth || {};
  return user.id ?? user.userId ?? user.sub ?? null;
}

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

/**
 * Mount consent routes under /api/v1/lifeos/consent.
 * @param {import('express').Application} app
 * @param {{ pool: object, requireAuth?: Function, requireKey?: Function, logger?: object }} deps
 */
export function registerLifeosConsentRoutes(app, deps = {}) {
  const pool = deps.pool;
  const requireAuth = deps.requireAuth || deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  if (!app || typeof app.post !== 'function') {
    throw new Error('registerLifeosConsentRoutes requires an express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerLifeosConsentRoutes requires deps.pool');
  }

  const registry = createConsentRegistry({ pool });

  app.post('/api/v1/lifeos/consent/grant', requireAuth, async (req, res) => {
    try {
      const userId = getRequesterId(req);
      const feature = typeof req.body?.feature === 'string' ? req.body.feature.trim() : '';
      const consentText = typeof req.body?.consentText === 'string' ? req.body.consentText.trim() : '';

      if (!userId) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      if (!feature) return sendJson(res, 400, { ok: false, error: 'feature is required' });

      const row = await registry.grantConsent({
        userId,
        feature,
        consentText: consentText || null,
        ipNote: req.ip || null,
      });
      return sendJson(res, 200, { ok: true, consent: row, features: getConsentFeatures() });
    } catch (error) {
      logger?.error?.({ err: error }, 'consent grant failed');
      const msg = error?.message || 'internal_error';
      const status = /Unknown feature/i.test(msg) ? 400 : 500;
      return sendJson(res, status, { ok: false, error: msg });
    }
  });

  app.post('/api/v1/lifeos/consent/revoke', requireAuth, async (req, res) => {
    try {
      const userId = getRequesterId(req);
      const feature = typeof req.body?.feature === 'string' ? req.body.feature.trim() : '';
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

      if (!userId) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      if (!feature) return sendJson(res, 400, { ok: false, error: 'feature is required' });

      const row = await registry.revokeConsent({
        userId,
        feature,
        reason: reason || null,
      });
      return sendJson(res, 200, { ok: true, consent: row });
    } catch (error) {
      logger?.error?.({ err: error }, 'consent revoke failed');
      const msg = error?.message || 'internal_error';
      const status = /Unknown feature/i.test(msg) ? 400 : 500;
      return sendJson(res, status, { ok: false, error: msg });
    }
  });

  app.get('/api/v1/lifeos/consent/status', requireAuth, async (req, res) => {
    try {
      const userId = getRequesterId(req);
      const feature = typeof req.query?.feature === 'string' ? req.query.feature.trim() : '';

      if (!userId) return sendJson(res, 401, { ok: false, error: 'unauthorized' });

      if (feature) {
        const granted = await registry.hasConsent(userId, feature);
        return sendJson(res, 200, {
          ok: true,
          feature,
          action: granted ? 'granted' : 'not_set_or_revoked',
          granted,
          features: getConsentFeatures(),
        });
      }

      const state = await registry.getConsentState(userId);
      return sendJson(res, 200, { ok: true, state, features: getConsentFeatures() });
    } catch (error) {
      logger?.error?.({ err: error }, 'consent status failed');
      return sendJson(res, 500, { ok: false, error: error?.message || 'internal_error' });
    }
  });
}

export default registerLifeosConsentRoutes;
