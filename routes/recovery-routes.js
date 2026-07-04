/**
 * SYNOPSIS: Exports createRecoveryRoutes — routes/recovery-routes.js.
 */
import express from 'express';

export function createRecoveryRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  async function insertEvent(ownerId, eventType, payload) {
    const { rows } = await pool.query(
      `INSERT INTO recovery_events (owner_id, event_type, payload)
       VALUES ($1, $2, $3::jsonb)
       RETURNING *`,
      [ownerId, eventType, JSON.stringify(payload || {})],
    );
    return rows[0];
  }

  function getOwnerId(req, res) {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      res.status(401).json({ error: 'jwt_required' });
      return null;
    }
    return ownerId;
  }

  router.post('/api/v1/recovery/onboarding', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { recovery_context, explicit_consent } = req.body || {};
      const data = await insertEvent(ownerId, 'onboarding', {
        recovery_context: recovery_context ?? null,
        explicit_consent: explicit_consent ?? null,
      });

      res.json({ ok: true, data });
    } catch (err) {
      logger?.error?.({ err }, 'recovery onboarding route failed');
      next(err);
    }
  });

  router.post('/api/v1/recovery/early_warning', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { behavioral_signals } = req.body || {};
      const data = await insertEvent(ownerId, 'early_warning', {
        behavioral_signals: behavioral_signals ?? null,
      });

      res.json({ ok: true, data });
    } catch (err) {
      logger?.error?.({ err }, 'recovery early warning route failed');
      next(err);
    }
  });

  router.post('/api/v1/recovery/trigger_mapping', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { triggers } = req.body || {};
      const data = await insertEvent(ownerId, 'trigger_mapping', {
        triggers: triggers ?? null,
      });

      res.json({ ok: true, data });
    } catch (err) {
      logger?.error?.({ err }, 'recovery trigger mapping route failed');
      next(err);
    }
  });

  router.post('/api/v1/recovery/accountability_link', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { trusted_person, consent } = req.body || {};
      const data = await insertEvent(ownerId, 'accountability_link', {
        trusted_person: trusted_person ?? null,
        consent: consent ?? null,
      });

      res.json({ ok: true, data });
    } catch (err) {
      logger?.error?.({ err }, 'recovery accountability link route failed');
      next(err);
    }
  });

  return router;
}