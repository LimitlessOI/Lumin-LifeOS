/**
 * SYNOPSIS: Exports createConflictArbitratorRoutes — routes/conflict-arbitrator-routes.js.
 */
import express from 'express';

function toJsonb(value) {
  return JSON.stringify(value ?? {});
}

function asText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function requireOwnerId(req, res) {
  const ownerId = req.lifeosUser?.sub || null;
  if (!ownerId) {
    res.status(401).json({ error: 'jwt_required' });
    return null;
  }
  return ownerId;
}

async function resolveUserScope(pool, userId, ownerId) {
  const { rows } = await pool.query(
    `SELECT id, owner_id
       FROM lifeos_users
      WHERE id = $1
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return { found: false, authorized: false };
  return {
    found: true,
    authorized: String(row.owner_id) === String(ownerId),
    id: row.id,
  };
}

export function createConflictArbitratorRoutes(app, ctx) {
  const { pool, requireKey, logger } = ctx || {};
  const router = express.Router();

  router.post('/api/v1/consent', async (req, res, next) => {
    try {
      const userId = asText(req.body?.user_id).trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
      if (typeof req.body?.consent !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'consent_required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO conflict_arbitrator_consents (user_id, consent)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET consent = EXCLUDED.consent, updated_at = NOW()
         RETURNING consent`,
        [userId, req.body.consent],
      );

      res.json({ ok: true, consent: rows[0]?.consent ?? req.body.consent });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/emotional-state', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwnerId(req, res);
      if (!ownerId) return;

      const userId = asText(req.body?.user_id).trim();
      const state = asText(req.body?.state).trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
      if (!state) return res.status(400).json({ ok: false, error: 'state_required' });

      const scope = await resolveUserScope(pool, userId, ownerId);
      if (!scope.found || !scope.authorized) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      const { rows } = await pool.query(
        `INSERT INTO conflict_arbitrator_emotional_states (user_id, owner_id, state)
         VALUES ($1, $2, $3)
         RETURNING state`,
        [userId, ownerId, state],
      );

      res.json({ ok: true, state: rows[0]?.state ?? state });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/turn-reflection', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwnerId(req, res);
      if (!ownerId) return;

      const userId = asText(req.body?.user_id).trim();
      const statement = asText(req.body?.statement).trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
      if (!statement) return res.status(400).json({ ok: false, error: 'statement_required' });

      const scope = await resolveUserScope(pool, userId, ownerId);
      if (!scope.found || !scope.authorized) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      const { rows } = await pool.query(
        `INSERT INTO conflict_arbitrator_reflections (user_id, owner_id, statement)
         VALUES ($1, $2, $3)
         RETURNING statement AS reflection`,
        [userId, ownerId, statement],
      );

      res.json({ ok: true, reflection: rows[0]?.reflection ?? statement });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/resolution-proposals', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwnerId(req, res);
      if (!ownerId) return;

      const userId = asText(req.body?.user_id).trim();
      const needs = req.body?.needs;
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
      if (needs === undefined) return res.status(400).json({ ok: false, error: 'needs_required' });

      const scope = await resolveUserScope(pool, userId, ownerId);
      if (!scope.found || !scope.authorized) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      const { rows } = await pool.query(
        `INSERT INTO conflict_arbitrator_resolution_proposals (user_id, owner_id, needs)
         VALUES ($1, $2, $3::jsonb)
         RETURNING needs AS proposals`,
        [userId, ownerId, toJsonb(needs)],
      );

      res.json({ ok: true, proposals: rows[0]?.proposals ?? needs });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/agreement', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwnerId(req, res);
      if (!ownerId) return;

      const userId = asText(req.body?.user_id).trim();
      const agreement = asText(req.body?.agreement).trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });
      if (!agreement) return res.status(400).json({ ok: false, error: 'agreement_required' });

      const scope = await resolveUserScope(pool, userId, ownerId);
      if (!scope.found || !scope.authorized) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      const { rows } = await pool.query(
        `INSERT INTO conflict_arbitrator_agreements (user_id, owner_id, agreement)
         VALUES ($1, $2, $3)
         RETURNING agreement`,
        [userId, ownerId, agreement],
      );

      res.json({ ok: true, agreement: rows[0]?.agreement ?? agreement });
    } catch (err) {
      next(err);
    }
  });

  if (typeof logger?.info === 'function') {
    logger.info({ route: 'conflict-arbitrator', mount: '/api/v1' }, 'conflict arbitrator routes initialized');
  }

  return router;
}