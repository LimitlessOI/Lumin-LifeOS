/**
 * SYNOPSIS: routes/canonical-execution-routes.js
 * routes/canonical-execution-routes.js
 * Phase 18 — Canonical execution queue + AI kill-switch routes (H-2 strategy).
 * Provides canonical equivalents for legacy command-center-routes.js execution surfaces.
 *
 * Canonical prefix: /api/v1/lifeos/
 * Legacy routes being replaced (H-2 — new file first, redirect in Phase 26-28):
 *   GET  /api/v1/tasks/queue          → GET  /api/v1/lifeos/tasks/queue
 *   GET  /api/v1/ai/performance       → GET  /api/v1/lifeos/admin/ai/performance
 *   POST /api/v1/admin/ai/enable      → POST /api/v1/lifeos/admin/ai/enable
 *   POST /api/v1/admin/ai/disable     → POST /api/v1/lifeos/admin/ai/disable
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import express from 'express';
import { createSystemOperationLedger } from '../services/system-operation-ledger.js';

export function createCanonicalExecutionRoutes({ requireKey, pool }) {
  const router = express.Router();
  const opLedger = createSystemOperationLedger({ pool });

  // Execution queue — canonical read from execution_tasks DB table
  router.get('/api/v1/lifeos/tasks/queue', requireKey, async (req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT task_id, type, description, status, created_at, completed_at
        FROM execution_tasks
        WHERE status IN ('pending', 'running', 'queued')
        ORDER BY
          CASE status
            WHEN 'running' THEN 1
            WHEN 'queued'  THEN 2
            ELSE 3
          END,
          created_at ASC
        LIMIT 50
      `);
      res.json({
        ok: true,
        tasks: rows,
        count: rows.length,
        read_path: 'GET /api/v1/lifeos/tasks/queue',
      });
    } catch (err) {
      next(err);
    }
  });

  // AI model performance — reads from autonomous_telemetry_events (canonical model truth)
  router.get('/api/v1/lifeos/admin/ai/performance', requireKey, async (req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          model_used,
          AVG(useful_work_score)                                        AS avg_score,
          COUNT(*)::int                                                 AS total,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::int         AS successes
        FROM autonomous_telemetry_events
        WHERE created_at > NOW() - INTERVAL '168 hours'
          AND model_used IS NOT NULL
        GROUP BY model_used
        ORDER BY avg_score DESC NULLS LAST
      `);
      res.json({
        ok: true,
        models: rows.map(r => ({
          model: r.model_used,
          avg_score: r.avg_score != null ? Math.round(Number(r.avg_score) * 1000) / 1000 : null,
          total: r.total,
          successes: r.successes,
        })),
        read_path: 'GET /api/v1/lifeos/admin/ai/performance',
      });
    } catch (err) {
      next(err);
    }
  });

  // AI kill switch — canonical path is env-based; these endpoints document the correct mechanism
  router.post('/api/v1/lifeos/admin/ai/enable', requireKey, (req, res) => {
    res.json({
      ok: true,
      note: 'canonical kill-switch is env-based: unset LIFEOS_AI_DISABLED in Railway env to enable',
      canonical_path: 'Railway env: LIFEOS_AI_DISABLED',
    });
  });

  router.post('/api/v1/lifeos/admin/ai/disable', requireKey, (req, res) => {
    res.json({
      ok: true,
      note: 'canonical kill-switch is env-based: set LIFEOS_AI_DISABLED=true in Railway env to disable',
      canonical_path: 'Railway env: LIFEOS_AI_DISABLED',
    });
  });

  router.get('/api/v1/lifeos/admin/operations/timeline', requireKey, async (req, res, next) => {
    try {
      const sinceHours = Number(req.query.since_hours || 24);
      const limit = Number(req.query.limit || 200);
      const task_id = req.query.task_id ? String(req.query.task_id) : null;
      const rows = await opLedger.getTimeline({ sinceHours, limit, task_id });
      res.json({
        ok: true,
        since_hours: sinceHours,
        count: rows.length,
        timeline: rows,
        read_path: 'GET /api/v1/lifeos/admin/operations/timeline',
        note: 'Each row has started_at, ended_at, duration_ms, total_tokens, cost_usd — tokens aligned by task_id.',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/admin/operations/summary', requireKey, async (req, res, next) => {
    try {
      const sinceHours = Number(req.query.since_hours || 24);
      const summary = await opLedger.getSummary({ sinceHours });
      res.json({
        ok: true,
        since_hours: sinceHours,
        summary,
        read_path: 'GET /api/v1/lifeos/admin/operations/summary',
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
