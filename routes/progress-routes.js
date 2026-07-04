/**
 * SYNOPSIS: Exports createProgressRoutes — routes/progress-routes.js.
 */
import express from 'express';

export function createProgressRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  function logError(err, context) {
    if (logger && typeof logger.error === 'function') {
      logger.error({ err, ...context }, 'progress routes error');
    }
  }

  router.get('/api/v1/progress', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { rows } = await pool.query(
        `SELECT *
           FROM progress
          WHERE owner_id = $1
          ORDER BY updated_at DESC, created_at DESC, id DESC`,
        [ownerId],
      );

      res.json({ ok: true, progress: rows });
    } catch (err) {
      logError(err, { route: 'GET /api/v1/progress' });
      next(err);
    }
  });

  router.post('/api/v1/progress/update', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { goal_id, progress } = req.body || {};
      if (typeof goal_id !== 'string' || !goal_id.trim()) {
        return res.status(400).json({ ok: false, error: 'goal_id_required' });
      }

      const parsedProgress = Number.parseInt(progress, 10);
      if (!Number.isInteger(parsedProgress)) {
        return res.status(400).json({ ok: false, error: 'progress_required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO progress (owner_id, goal_id, progress)
         VALUES ($1, $2, $3)
         ON CONFLICT (owner_id, goal_id)
         DO UPDATE SET progress = EXCLUDED.progress, updated_at = NOW()
         RETURNING *`,
        [ownerId, goal_id.trim(), parsedProgress],
      );

      res.json({ ok: true, updated: rows[0] });
    } catch (err) {
      logError(err, { route: 'POST /api/v1/progress/update' });
      next(err);
    }
  });

  return router;
}