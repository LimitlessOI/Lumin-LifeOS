/**
 * SYNOPSIS: Standalone Express router for the pipeline report endpoint.
 */
import { Router } from 'express';
import logger from '../services/logger.js';

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Standalone Express router for the pipeline report endpoint.
 */
export default function createPipelineReportRoutes(app, { pool, requireKey }) {
  const router = Router();

  // GET /api/v1/sites/pipeline-report
  // Returns pipeline statistics from prospect_sites table.
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

      const rawStats = result.rows[0];

      const pipelineStats = {
        total: Number(rawStats?.total || 0),
        built: Number(rawStats?.built || 0),
        qa_hold: Number(rawStats?.qa_hold || 0),
        sent: Number(rawStats?.sent || 0),
        viewed: Number(rawStats?.viewed || 0),
        replied: Number(rawStats?.replied || 0),
        converted: Number(rawStats?.converted || 0),
        total_revenue: Number(rawStats?.total_revenue || 0),
      };

      res.json({ ok: true, pipeline: pipelineStats });
    } catch (err) {
      logger.error('[PIPELINE_REPORT] Error fetching pipeline report', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/sites', router); // Mount the router under /api/v1/sites
  return router;
}