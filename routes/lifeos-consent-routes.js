/**
 * SYNOPSIS: Registers LifeosConsentRoutes routes/handlers (routes/lifeos-consent-routes.js).
 */
import express from 'express';

class ConsentRegistry {
  constructor({ pool }) {
    if (!pool || typeof pool.query !== 'function') {
      throw new Error('createConsentRegistry requires a pg pool');
    }
    this.pool = pool;
  }

  async grant({ userId, feature, consentText, ipNote = null }) {
    const existing = await this.pool.query(
      'SELECT id, granted_at, revoked_at, created_at FROM conflict_consent WHERE user_id = $1 AND consent_type = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, feature],
    );

    if (existing.rows.length > 0 && !existing.rows[0].revoked_at) {
      const updated = await this.pool.query(
        'UPDATE conflict_consent SET revoked_at = NULL WHERE id = $1 RETURNING id, user_id, partner_user_id, consent_type, granted_at, revoked_at, created_at',
        [existing.rows[0].id],
      );
      return updated.rows[0];
    }

    const result = await this.pool.query(
      'INSERT INTO conflict_consent (user_id, partner_user_id, consent_type, granted_at, revoked_at) VALUES ($1, $2, $3, NOW(), NULL) RETURNING id, user_id, partner_user_id, consent_type, granted_at, revoked_at, created_at',
      [userId, null, feature],
    );

    await this.pool.query(
      'INSERT INTO consent_registry (user_id, feature, consent_text, ip_note, not) VALUES ($1, $2, $3, $4, $5)',
      [userId, feature, consentText, ipNote, false],
    );

    return result.rows[0];
  }

  async revoke({ userId, feature, reason = null, ipNote = null }) {
    const result = await this.pool.query(
      'UPDATE conflict_consent SET revoked_at = NOW() WHERE user_id = $1 AND consent_type = $2 AND revoked_at IS NULL RETURNING id, user_id, partner_user_id, consent_type, granted_at, revoked_at, created_at',
      [userId, feature],
    );

    if (result.rows.length === 0) {
      return null;
    }

    await this.pool.query(
      'INSERT INTO consent_registry (user_id, feature, consent_text, ip_note, not) VALUES ($1, $2, $3, $4, $5)',
      [userId, feature, reason || 'revoked', ipNote, true],
    );

    return result.rows[0];
  }

  async status({ userId, feature }) {
    const result = await this.pool.query(
      'SELECT id, user_id, partner_user_id, consent_type, granted_at, revoked_at, created_at FROM conflict_consent WHERE user_id = $1 AND consent_type = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, feature],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}

export function createConsentRegistry({ pool }) {
  return new ConsentRegistry({ pool });
}

function getRequesterId(req) {
  return req.user?.id ?? req.auth?.userId ?? req.auth?.id ?? null;
}

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

export function registerLifeosConsentRoutes(app, deps = {}) {
  const pool = deps.pool;
  const requireAuth = deps.requireAuth || deps.requireKey;

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerLifeosConsentRoutes requires deps.pool');
  }
  if (typeof requireAuth !== 'function') {
    throw new Error('registerLifeosConsentRoutes requires deps.requireAuth or deps.requireKey');
  }

  const registry = createConsentRegistry({ pool });

  const router = express.Router();
  router.use(requireAuth);

  router.post('/grant', async (req, res) => {
    try {
      const userId = getRequesterId(req);
      const feature = typeof req.body?.feature === 'string' ? req.body.feature.trim() : '';
      const consentText = typeof req.body?.consentText === 'string' ? req.body.consentText.trim() : '';

      if (!userId) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      if (!feature) return sendJson(res, 400, { ok: false, error: 'feature is required' });

      const row = await registry.grant({
        userId,
        feature,
        consentText,
        ipNote: req.ip || null,
      });

      return sendJson(res, 200, { ok: true, consent: row });
    } catch (error) {
      req.app?.get('logger')?.error?.({ err: error }, 'consent grant failed');
      return sendJson(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  router.post('/revoke', async (req, res) => {
    try {
      const userId = getRequesterId(req);
      const feature = typeof req.body?.feature === 'string' ? req.body.feature.trim() : '';
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

      if (!userId) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      if (!feature) return sendJson(res, 400, { ok: false, error: 'feature is required' });

      const row = await registry.revoke({
        userId,
        feature,
        reason,
        ipNote: req.ip || null,
      });

      if (!row) return sendJson(res, 404, { ok: false, error: 'consent not found' });

      return sendJson(res, 200, { ok: true, consent: row });
    } catch (error) {
      req.app?.get('logger')?.error?.({ err: error }, 'consent revoke failed');
      return sendJson(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  router.get('/status', async (req, res) => {
    try {
      const userId = getRequesterId(req);
      const feature = typeof req.query?.feature === 'string' ? req.query.feature.trim() : '';

      if (!userId) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      if (!feature) return sendJson(res, 400, { ok: false, error: 'feature is required' });

      const row = await registry.status({ userId, feature });
      return sendJson(res, 200, { ok: true, consent: row });
    } catch (error) {
      req.app?.get('logger')?.error?.({ err: error }, 'consent status failed');
      return sendJson(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  app.use('/api/v1/lifeos/consent', router);
}

export default registerLifeosConsentRoutes;