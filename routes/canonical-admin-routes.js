/**
 * SYNOPSIS: routes/canonical-admin-routes.js
 * routes/canonical-admin-routes.js
 * Phase 17 — Canonical system admin + status routes (H-2 strategy).
 * Provides canonical equivalents for legacy command-center-routes.js admin surfaces.
 *
 * Canonical prefix: /api/v1/lifeos/
 * Legacy routes being replaced (H-2 — new file first, redirect in Phase 26-28):
 *   GET /api/v1/admin/ai/status          → GET /api/v1/lifeos/admin/ai/status
 *   GET /api/v1/reality/snapshot         → GET /api/v1/lifeos/system/snapshot
 *   GET /api/health                      → GET /api/v1/lifeos/system/health
 *   GET /api/v1/ai/effectiveness         → GET /api/v1/lifeos/admin/ai/effectiveness
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import express from 'express';

export function createCanonicalAdminRoutes({ requireKey, pool }) {
  const router = express.Router();

  // AI kill switch — canonical read path (env-based; write via Railway env vars)
  router.get('/api/v1/lifeos/admin/ai/status', requireKey, (req, res) => {
    const aiEnabled = process.env.LIFEOS_AI_DISABLED !== 'true';
    res.json({
      ok: true,
      aiEnabled,
      source: 'env',
      env_var: 'LIFEOS_AI_DISABLED',
      note: 'canonical read-only; set LIFEOS_AI_DISABLED=true in Railway env to disable',
    });
  });

  // System snapshot — latest receipt timestamp + deploy SHA
  router.get('/api/v1/lifeos/system/snapshot', requireKey, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT MAX(audited_at) AS latest FROM builder_audit_receipts'
      );
      const snapshotAt = rows[0]?.latest
        ? new Date(rows[0].latest).toISOString()
        : new Date().toISOString();
      res.json({
        ok: true,
        snapshot_at: snapshotAt,
        deploy_sha: process.env.RAILWAY_GIT_COMMIT_SHA || null,
        source: rows[0]?.latest ? 'db_latest_receipt' : 'no_receipts',
      });
    } catch (err) {
      next(err);
    }
  });

  // Simple health check — canonical equivalent of GET /api/health
  router.get('/api/v1/lifeos/system/health', (req, res) => {
    res.json({ ok: true, server: 'ok', timestamp: new Date().toISOString() });
  });

  // AI effectiveness by model — reads from autonomous_telemetry_events
  router.get('/api/v1/lifeos/admin/ai/effectiveness', requireKey, async (req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          model_used,
          AVG(useful_work_score)   AS avg_score,
          COUNT(*)::int            AS total
        FROM autonomous_telemetry_events
        WHERE created_at > NOW() - INTERVAL '168 hours'
          AND model_used IS NOT NULL
        GROUP BY model_used
        ORDER BY avg_score DESC NULLS LAST
      `);
      res.json({
        ok: true,
        ratings: rows.map(r => ({
          model: r.model_used,
          avg_score: r.avg_score != null ? Math.round(Number(r.avg_score) * 1000) / 1000 : null,
          total: r.total,
        })),
        read_path: 'GET /api/v1/lifeos/admin/ai/effectiveness',
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
