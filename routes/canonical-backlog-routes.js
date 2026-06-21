/**
 * SYNOPSIS: Exports createCanonicalBacklogRoutes — routes/canonical-backlog-routes.js.
 */
import express from 'express';

/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
export function createCanonicalBacklogRoutes({ requireKey, pool }) {
  const router = express.Router();

  router.use(requireKey);

  router.get('/api/v1/lifeos/projects/backlog', async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, name, description, amendment, priority, status, notes, last_triggered_at, completed_at, created_at FROM project_backlog ORDER BY priority ASC'
      );
      res.json({ ok: true, projects: rows, read_path: 'GET /api/v1/lifeos/projects/backlog' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/projects/backlog', async (req, res, next) => {
    try {
      if (!req.body?.name || !req.body?.description) return res.status(400).json({ ok: false, error: 'name and description required' });
      const { rows } = await pool.query(
        'INSERT INTO project_backlog (name, description, priority, notes, status) VALUES ($1, $2, $3, $4, \'pending\') RETURNING *',
        [req.body.name, req.body.description, req.body.priority ?? 50, req.body.notes ?? null]
      );
      res.json({ ok: true, project: rows[0], read_path: 'POST /api/v1/lifeos/projects/backlog' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/projects/backlog/:id/complete', async (req, res, next) => {
    try {
      await pool.query('UPDATE project_backlog SET status = \'complete\', completed_at = NOW() WHERE id = $1', [req.params.id]);
      res.json({ ok: true, message: `Project ${req.params.id} marked complete` });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/projects/backlog/:id/skip', async (req, res, next) => {
    try {
      await pool.query('UPDATE project_backlog SET status = \'skipped\' WHERE id = $1', [req.params.id]);
      res.json({ ok: true, message: `Project ${req.params.id} skipped` });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/projects/backlog/:id/reactivate', async (req, res, next) => {
    try {
      await pool.query('UPDATE project_backlog SET status = \'pending\', completed_at = NULL WHERE id = $1', [req.params.id]);
      res.json({ ok: true, message: `Project ${req.params.id} reactivated` });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/api/v1/lifeos/projects/backlog/:id', async (req, res, next) => {
    try {
      if (req.body?.priority === undefined && req.body?.notes === undefined) return res.status(400).json({ ok: false, error: 'nothing to update' });
      const updates = [];
      const vals = [];
      let i = 1;
      if (req.body.priority !== undefined) {
        updates.push(`priority = $${i++}`);
        vals.push(req.body.priority);
      }
      if (req.body.notes !== undefined) {
        updates.push(`notes = $${i++}`);
        vals.push(req.body.notes);
      }
      vals.push(req.params.id);
      await pool.query(`UPDATE project_backlog SET ${updates.join(', ')} WHERE id = $${i}`, vals);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}