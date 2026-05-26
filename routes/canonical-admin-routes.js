// routes/canonical-admin-routes.js
import express from 'express';
import { Pool } from 'pg';
import { createUsefulWorkGuard } from 'startup/register-schedulers.js';

const router = express.Router();

/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
export function createCanonicalAdminRoutes({ rk, pool }) {
  // 1. GET /api/v1/lifeos/admin/ai/status
  router.get('/admin/ai/status', async (req, res, next) => {
    const aiDisabled = process.env.LIFEOS_AI_DISABLED === 'true';
    res.json({ ok: true, aiEnabled: !aiDisabled, source: 'env', env_var: 'LIFEOS_AI_DISABLED', note: 'canonical read-only; write via Railway env' });
  });

  // 2. GET /api/v1/lifeos/system/snapshot
  router.get('/system/snapshot', async (req, res, next) => {
    try {
      const result = await pool.query('SELECT MAX(created_at) FROM builder_audit_receipts');
      const snapshotAt = result.rows[0].max;
      const deploySha = process.env.RAILWAY_GIT_COMMIT_SHA || null;
      res.json({ ok: true, snapshot_at: snapshotAt.toISOString(), deploy_sha: deploySha, source: 'db_latest_receipt' });
    } catch (error) {
      res.json({ ok: true, snapshot_at: new Date().toISOString(), deploy_sha: null, source: 'no_db' });
    }
  });

  // 3. GET /api/v1/lifeos/system/health
  router.get('/system/health', (req, res, next) => {
    res.json({ ok: true, server: 'ok', timestamp: new Date().toISOString() });
  });

  // 4. GET /api/v1/lifeos/admin/ai/effectiveness
  router.get('/admin/ai/effectiveness', async (req, res, next) => {
    try {
      const result = await pool.query('SELECT model_used, AVG(useful_work_score) as avg_score, COUNT(*) as total FROM autonomous_telemetry_events WHERE created_at > NOW()-INTERVAL 168h GROUP BY model_used ORDER BY avg_score DESC');
      const ratings = result.rows.map((row) => ({ model: row.model_used, avg_score: row.avg_score, total: row.total }));
      res.json({ ok: true, ratings });
    } catch (error) {
      res.json({ ok: true, ratings: [] });
    }
  });

  return router;
}