import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES_API_KEY
import { getRegistryHealth } from '../services/env-registry-map.js';
import { rk } from '../mw/auth.js'; // Assuming rk is from this path
import { pool } from '../db/pool.js'; // ASSUMPTION: pool is available here for DB access
const router = Router();
// Helper functions for consistent API responses, assuming j400/j500 are used elsewhere
const j400 = (res, data) => res.status(400).json(data);
const j500 = (res, data) => res.status(500).json(data);
// New apiEP for launch readiness
router.get('/launch-readiness', rk, async (req, res) => { try { const healthReport = getRegistryHealth(); const ready = healthReport.summary.healthy; const missing_needed = healthReport.missingNeeded.map(item => item.name); const revenue_blockers = healthReport.revenueBlockers.map(item => item.name); const checked_at = new Date().toISOString(); res.json({ ok: true, ready, missing_needed, revenue_blockers, checked_at, }); } catch (error) { console.error('Error checking launch readiness:', error); j500(res, { ok: false, error: 'Failed to retrieve launch readiness status.' }); }
});

// New route for pipeline report
router.get('/pipeline-report', rk, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'built') AS built,
          COUNT(*) FILTER (WHERE status = 'qa_hold') AS qa_hold,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'viewed') AS viewed,
          COUNT(*) FILTER (WHERE status = 'replied') AS replied,
          COUNT(*) FILTER (WHERE status = 'converted') AS converted,
          COALESCE(SUM(deal_value) FILTER (WHERE status = 'converted'), 0) AS total_revenue
      FROM
          prospect_sites;
    `);

    const pipelineStats = result.rows[0];

    res.json({
      ok: true,
      pipeline: {
        total: parseInt(pipelineStats.total || 0),
        built: parseInt(pipelineStats.built || 0),
        qa_hold: parseInt(pipelineStats.qa_hold || 0),
        sent: parseInt(pipelineStats.sent || 0),
        viewed: parseInt(pipelineStats.viewed || 0),
        replied: parseInt(pipelineStats.replied || 0),
        converted: parseInt(pipelineStats.converted || 0),
        total_revenue: parseFloat(pipelineStats.total_revenue || 0),
      },
    });
  } catch (error) {
    console.error('Error retrieving pipeline report:', error);
    j500(res, { ok: false, error: 'Failed to retrieve pipeline report.' });
  }
});

// Inlined discovery logic from scripts/site-builder-prospect-discovery.mjs
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'n'];
export default router;