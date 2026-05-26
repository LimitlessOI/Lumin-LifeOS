import express from 'express';

/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
export function createCanonicalExecutionRoutes({ rk, pool }) {
  const router = express.Router();

  router.get('/api/v1/lifeos/tasks/queue', rk, async (req, res) => {
    const query = {
      text: `
        SELECT task_id, type, description, status, created_at, completed_at
        FROM execution_tasks
        WHERE status IN (pending, running, queued)
        ORDER BY CASE status WHEN running THEN 1 WHEN queued THEN 2 ELSE 3 END, created_at ASC
        LIMIT 50
      `,
    };

    const result = await pool.query(query);
    const tasks = result.rows;
    const count = tasks.length;

    res.json({ ok: true, tasks, count, read_path: '/api/v1/lifeos/tasks/queue' });
  });

  router.get('/api/v1/lifeos/admin/ai/performance', rk, async (req, res) => {
    const query = {
      text: `
        SELECT model_used, AVG(useful_work_score) AS avg_score, COUNT(*)::int AS total,
               SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::int AS successes
        FROM autonomous_telemetry_events
        WHERE created_at > NOW() - INTERVAL '168 hours' AND model_used IS NOT NULL
        GROUP BY model_used
        ORDER BY avg_score DESC NULLS LAST
      `,
    };

    const result = await pool.query(query);
    const rows = result.rows;
    const models = rows.map((r) => ({
      model: r.model_used,
      avg_score: r.avg_score != null ? Math.round(Number(r.avg_score) * 1000) / 1000 : null,
      total: r.total,
      successes: r.successes,
    }));

    res.json({ ok: true, models, read_path: '/api/v1/lifeos/admin/ai/performance' });
  });

  router.post('/api/v1/lifeos/admin/ai/enable', rk, (req, res) => {
    res.json({ ok: true, note: 'canonical kill-switch is env-based: unset LIFEOS_AI_DISABLED in Railway env to enable', canonical_path: 'Railway env: LIFEOS_AI_DISABLED' });
  });

  router.post('/api/v1/lifeos/admin/ai/disable', rk, (req, res) => {
    res.json({ ok: true, note: 'canonical kill-switch is env-based: set LIFEOS_AI_DISABLED=true in Railway env to disable', canonical_path: 'Railway env: LIFEOS_AI_DISABLED' });
  });

  return router;
}