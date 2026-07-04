/**
 * SYNOPSIS: Exports createTrialRoutes — routes/trial-routes.js.
 */
import express from 'express';

export function createTrialRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/trial', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { userId, startDate } = req.body || {};
      if (!userId) return res.status(400).json({ ok: false, error: 'userId_required' });
      if (!startDate) return res.status(400).json({ ok: false, error: 'startDate_required' });

      const { rows } = await pool.query(
        `INSERT INTO user_trials (owner_id, user_id, start_date)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [ownerId, userId, startDate],
      );

      return res.json({ ok: true, trialId: rows[0]?.id || null });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'trial route failed');
      next(err);
    }
  });

  return router;
}