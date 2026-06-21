/**
 * SYNOPSIS: Exports createTsosEfficiencyRoutes — routes/tsos-efficiency-routes.js.
 */
import express from 'express';
import { buildTsosEvidenceQuality } from '../services/builderos-tsos-evidence.js';
import { listRoutingDecisions } from '../services/builderos-tsos-routing.js';

/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
export function createTsosEfficiencyRoutes({ requireKey, pool }) {
  const router = express.Router();

  router.use(requireKey);

  router.get('/api/v1/lifeos/builderos/tsos-evidence', async (req, res, next) => {
    try {
      const evidence = await buildTsosEvidenceQuality(pool);
      res.json(evidence);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/builderos/tsos-routing-decisions', async (req, res, next) => {
    try {
      const result = await listRoutingDecisions(pool, {
        limit: req.query.limit,
        changedOnly: req.query.changed_only === 'true',
        hypotheticalOnly: req.query.hypothetical_only === 'true',
        mode: req.query.mode,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/builderos/tsos-efficiency', async (req, res, next) => {
    try {
      const [metricsRes, hookCountRes, latestHookRes] = await Promise.all([
        pool.query(`
          SELECT COUNT(*)::int AS token_tracked_events,
                 COALESCE(SUM(total_token_estimate),0)::int AS total_token_estimate_sum,
                 ROUND((SUM(useful_work_score::numeric)/NULLIF(SUM(total_token_estimate::numeric),0))*1000,3) AS useful_work_per_1k_tokens
          FROM autonomous_telemetry_events
          WHERE total_token_estimate > 0
        `),
        pool.query(`
          SELECT COUNT(*)::int AS hook_event_count
          FROM autonomous_telemetry_events
          WHERE task_type = 'tsos_internal_hook'
        `),
        pool.query(`
          SELECT id, run_id, created_at, model_used, task_goal, metadata
          FROM autonomous_telemetry_events
          WHERE task_type = 'tsos_internal_hook'
          ORDER BY created_at DESC
          LIMIT 1
        `),
      ]);
      const metrics = metricsRes.rows[0];
      const hookEventCount = hookCountRes.rows[0].hook_event_count;
      const latestHookEvent = latestHookRes.rows[0] || null;

      const response = {
        ok: true,
        hook_event_count: hookEventCount,
        latest_hook_event: latestHookEvent,
        hook_status: hookEventCount > 0 ? 'LIVE' : 'NOT_WIRED',
        proof_source: "autonomous_telemetry_events WHERE task_type = 'tsos_internal_hook'",
        token_tracked_events: metrics.token_tracked_events,
        total_token_estimate_sum: metrics.total_token_estimate_sum,
        useful_work_per_1k_tokens: metrics.useful_work_per_1k_tokens,
        no_data: hookEventCount === 0 && metrics.token_tracked_events === 0,
        read_path: 'GET /api/v1/lifeos/builderos/tsos-efficiency',
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
