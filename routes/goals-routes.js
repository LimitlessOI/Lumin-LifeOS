/**
 * SYNOPSIS: Exports createGoalsRoutes — routes/goals-routes.js.
 */
import express from 'express';

function parseDateOrNull(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeId(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function toGoalResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    owner_id: row.owner_id,
    goal_name: row.goal_name,
    description: row.description,
    target_date: row.target_date,
    progress_percent: row.progress_percent,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createGoalsRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = logger || console;

  router.post('/api/v1/goals', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const goalName = normalizeId(req.body?.goal_name);
      const description = req.body?.description == null ? '' : String(req.body.description);
      const targetDate = parseDateOrNull(req.body?.target_date);

      if (!goalName) return res.status(400).json({ ok: false, error: 'goal_name_required' });
      if (!targetDate) return res.status(400).json({ ok: false, error: 'target_date_required' });

      const { rows } = await pool.query(
        `INSERT INTO goals (owner_id, goal_name, description, target_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [ownerId, goalName, description, targetDate],
      );

      return res.json({ ok: true, data: toGoalResponse(rows[0]) });
    } catch (err) {
      log?.error?.({ err }, 'goals_create_failed');
      next(err);
    }
  });

  router.get('/api/v1/goals/:id', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const goalId = normalizeId(req.params.id);
      const { rows } = await pool.query(
        `SELECT * FROM goals WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [goalId, ownerId],
      );

      if (!rows[0]) return res.status(404).json({ ok: false, error: 'goal_not_found' });
      return res.json({ ok: true, data: toGoalResponse(rows[0]) });
    } catch (err) {
      log?.error?.({ err }, 'goals_get_failed');
      next(err);
    }
  });

  router.put('/api/v1/goals/:id', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const goalId = normalizeId(req.params.id);
      const goalName = normalizeId(req.body?.goal_name);
      const description = req.body?.description == null ? '' : String(req.body.description);
      const targetDate = parseDateOrNull(req.body?.target_date);

      if (!goalName) return res.status(400).json({ ok: false, error: 'goal_name_required' });
      if (!targetDate) return res.status(400).json({ ok: false, error: 'target_date_required' });

      const { rows } = await pool.query(
        `UPDATE goals
            SET goal_name = $1,
                description = $2,
                target_date = $3,
                updated_at = NOW()
          WHERE id = $4 AND owner_id = $5
          RETURNING *`,
        [goalName, description, targetDate, goalId, ownerId],
      );

      if (!rows[0]) return res.status(404).json({ ok: false, error: 'goal_not_found' });
      return res.json({ ok: true, data: toGoalResponse(rows[0]) });
    } catch (err) {
      log?.error?.({ err }, 'goals_update_failed');
      next(err);
    }
  });

  router.delete('/api/v1/goals/:id', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const goalId = normalizeId(req.params.id);
      const { rows } = await pool.query(
        `DELETE FROM goals WHERE id = $1 AND owner_id = $2 RETURNING id`,
        [goalId, ownerId],
      );

      if (!rows[0]) return res.status(404).json({ ok: false, error: 'goal_not_found' });
      return res.json({ ok: true });
    } catch (err) {
      log?.error?.({ err }, 'goals_delete_failed');
      next(err);
    }
  });

  return router;
}