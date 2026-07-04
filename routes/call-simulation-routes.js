/**
 * SYNOPSIS: Exports createCallSimulationRoutes — routes/call-simulation-routes.js.
 */
import express from 'express';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toInt(value, fallback = null) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

function requireOwner(req, res) {
  const ownerId = getOwnerId(req);
  if (!ownerId) {
    res.status(401).json({ error: 'jwt_required' });
    return null;
  }
  return ownerId;
}

function safeLogger(logger) {
  const base = logger && typeof logger === 'object' ? logger : null;
  return {
    info: typeof base?.info === 'function' ? base.info.bind(base) : () => {},
    warn: typeof base?.warn === 'function' ? base.warn.bind(base) : () => {},
    error: typeof base?.error === 'function' ? base.error.bind(base) : () => {},
    debug: typeof base?.debug === 'function' ? base.debug.bind(base) : () => {},
  };
}

export function createCallSimulationRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = safeLogger(logger);

  router.post('/start', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwner(req, res);
      if (!ownerId) return;

      const { script_id, user_id } = req.body || {};
      if (!isNonEmptyString(script_id)) {
        return res.status(400).json({ ok: false, error: 'script_id_required' });
      }
      if (!isNonEmptyString(user_id)) {
        return res.status(400).json({ ok: false, error: 'user_id_required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO call_simulations (owner_id, script_id, user_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'started', NOW(), NOW())
         RETURNING id`,
        [ownerId, script_id.trim(), user_id.trim()],
      );

      const simulationId = rows[0]?.id ?? null;
      log.info?.('call_simulation_started', { ownerId, simulationId, script_id: script_id.trim(), user_id: user_id.trim() });

      return res.json({ ok: true, simulation_id: simulationId });
    } catch (err) {
      next(err);
    }
  });

  router.post('/end', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwner(req, res);
      if (!ownerId) return;

      const { simulation_id } = req.body || {};
      if (!isNonEmptyString(simulation_id)) {
        return res.status(400).json({ ok: false, error: 'simulation_id_required' });
      }

      const simId = simulation_id.trim();

      const { rows: existingRows } = await pool.query(
        `SELECT id, owner_id, script_id, user_id, status, result
           FROM call_simulations
          WHERE id = $1
          LIMIT 1`,
        [simId],
      );

      const existing = existingRows[0];
      if (!existing) {
        return res.status(404).json({ ok: false, error: 'simulation_not_found' });
      }
      if (existing.owner_id !== ownerId) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      const result = {
        ended_at: new Date().toISOString(),
        status: 'ended',
        script_id: existing.script_id,
        user_id: existing.user_id,
      };

      const { rows } = await pool.query(
        `UPDATE call_simulations
            SET status = 'ended',
                result = $2::jsonb,
                updated_at = NOW()
          WHERE id = $1
            AND owner_id = $3
         RETURNING result`,
        [simId, JSON.stringify(result), ownerId],
      );

      const updatedResult = rows[0]?.result ?? result;
      log.info?.('call_simulation_ended', { ownerId, simulationId: simId });

      return res.json({ ok: true, result: updatedResult });
    } catch (err) {
      next(err);
    }
  });

  return router;
}