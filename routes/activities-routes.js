/**
 * SYNOPSIS: Exports createActivityRoutes — routes/activities-routes.js.
 */
import express from 'express';

export function createActivityRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  function logInfo(message, extra = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(extra, message);
    }
  }

  function logError(message, extra = {}) {
    if (logger && typeof logger.error === 'function') {
      logger.error(extra, message);
    }
  }

  function parseDuration(value) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : NaN;
  }

  function validateBody(body) {
    const activityName = String(body?.activity_name || '').trim();
    const duration = parseDuration(body?.duration);
    const timestamp = String(body?.timestamp || '').trim();

    if (!activityName) return { error: 'activity_name_required' };
    if (!Number.isInteger(duration)) return { error: 'duration_required' };
    if (!timestamp) return { error: 'timestamp_required' };

    return { activityName, duration, timestamp };
  }

  async function getOwnerId(req, res) {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      res.status(401).json({ error: 'jwt_required' });
      return null;
    }
    return ownerId;
  }

  router.post('/api/v1/activities', requireKey, async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req, res);
      if (!ownerId) return;

      const parsed = validateBody(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const { rows } = await pool.query(
        `INSERT INTO activities (owner_id, activity_name, duration, timestamp)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [ownerId, parsed.activityName, parsed.duration, parsed.timestamp],
      );

      const data = rows[0] || null;
      logInfo('activity_created', { ownerId, activityName: parsed.activityName });
      res.json({ ok: true, data });
    } catch (err) {
      logError('activity_create_failed', { err: err?.message });
      next(err);
    }
  });

  router.get('/api/v1/activities', requireKey, async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req, res);
      if (!ownerId) return;

      const { rows } = await pool.query(
        `SELECT *
           FROM activities
          WHERE owner_id = $1
          ORDER BY timestamp DESC, id DESC`,
        [ownerId],
      );

      res.json({ ok: true, data: rows });
    } catch (err) {
      logError('activity_list_failed', { err: err?.message });
      next(err);
    }
  });

  return router;
}