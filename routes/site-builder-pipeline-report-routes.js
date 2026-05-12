import { Router } from 'express';
import logger from '../services/logger.js';

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Creates an Express router for the pipeline report endpoint.
 * Mounts GET /api/v1/sites/pipeline-report to provide pipeline statistics.
 */
export default function createPipelineReportRoutes(app, { pool, requireKey }) {
  const router = Router();

  /**
   * GET /api/v1/sites/pipeline-report
   * Returns pipeline statistics: total, built, qa_hold, sent, viewed, replied, converted, total_revenue.
   * Auth: key
   */
  router.get('/pipeline-report', requireKey, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'qa_hold') AS qa_hold,
          COUNT(*) FILTER (WHERE status = 'built') AS built,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'viewed') AS viewed,
          COUNT(*) FILTER (WHERE status = 'replied') AS replied,
          COUNT(*) FILTER (WHERE status = 'converted') AS converted,
          COALESCE(SUM(deal_value) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
          COUNT(*) AS total
        FROM prospect_sites`
      );

      // Ensure a graceful zeroed payload if no rows exist or query returns nulls
      const pipelineStats = result.rows[0] || {
        qa_hold: 0,
        built: 0,
        sent: 0,
        viewed: 0,
        replied: 0,
        converted: 0,
        total_revenue: 0,
        total: 0,
      };

      res.json({ ok: true, pipeline: pipelineStats });

    } catch (err) {
      logger.error('[PIPELINE_REPORT] Error fetching pipeline report', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // The router is returned, and the caller (e.g., server.js) is responsible for mounting it
  // under the /api/v1/sites base path.
  return router;
}