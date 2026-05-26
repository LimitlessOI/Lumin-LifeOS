import express from 'express';

/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
export function createTsosEfficiencyRoutes({ rk, pool }) {
  const router = express.Router();

  router.use(rk);

  router.get('/api/v1/lifeos/builderos/tsos-efficiency', async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        text`
          SELECT COUNT()::int AS token_tracked_events,
                 COALESCE(SUM(total_token_estimate),0)::int AS total_token_estimate_sum,
                 ROUND((SUM(useful_work_score::numeric)/NULLIF(SUM(total_token_estimate::numeric),0))1000,3) AS useful_work_per_1k_tokens
          FROM autonomous_telemetry_events
          WHERE total_token_estimate > 0
        `,
      );

      const response = {
        ok: true,
        token_tracked_events: rows[0].token_tracked_events,
        total_token_estimate_sum: rows[0].total_token_estimate_sum,
        useful_work_per_1k_tokens: rows[0].useful_work_per_1k_tokens,
        no_data: rows[0].token_tracked_events === 0,
        read_path: 'GET /api/v1/lifeos/builderos/tsos-efficiency',
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}