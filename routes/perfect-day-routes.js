/**
 * SYNOPSIS: Exports createPerfectDayRoutes — routes/perfect-day-routes.js.
 */
import express from 'express';

function parseISODate(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function normalizeActivities(value) {
  if (!Array.isArray(value)) return null;
  return value.map((activity, index) => {
    if (activity && typeof activity === 'object' && !Array.isArray(activity)) {
      return activity;
    }
    return { order: index + 1, value: activity };
  });
}

export function createPerfectDayRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/plan', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const date = parseISODate(req.body?.date);
      const activities = normalizeActivities(req.body?.activities);

      if (!date) return res.status(400).json({ ok: false, error: 'date_required' });
      if (!activities) return res.status(400).json({ ok: false, error: 'activities_required' });

      const { rows } = await pool.query(
        `INSERT INTO perfect_day_plans (owner_id, plan_date, activities, source)
         VALUES ($1, $2::date, $3::jsonb, 'api')
         ON CONFLICT (owner_id, plan_date)
         DO UPDATE SET activities = EXCLUDED.activities, updated_at = NOW()
         RETURNING id`,
        [ownerId, date, JSON.stringify(activities)],
      );

      return res.json({ ok: true, plan_id: rows[0]?.id || null });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'perfect_day_plan_create_failed');
      next(err);
    }
  });

  router.get('/plan', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const date = parseISODate(req.query?.date);
      if (!date) return res.status(400).json({ ok: false, error: 'date_required' });

      const { rows } = await pool.query(
        `SELECT id, owner_id, plan_date, activities, source, created_at, updated_at
           FROM perfect_day_plans
          WHERE owner_id = $1 AND plan_date = $2::date
          LIMIT 1`,
        [ownerId, date],
      );

      return res.json({ ok: true, plan: rows[0] || null });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'perfect_day_plan_get_failed');
      next(err);
    }
  });

  return router;
}
const createXxxRoutes = createPerfectDayRoutes;
export { createXxxRoutes };