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

// New API endpoint for launch readiness
router.get('/launch-readiness', rk, async (req, res) => {
  try {
    const healthReport = getRegistryHealth();
    const ready = healthReport.summary.healthy;
    const missing_needed = healthReport.missingNeeded.map(item => item.name);
    const revenue_blockers = healthReport.revenueBlockers.map(item => item.name);
    const checked_at = new Date().toISOString();

    res.json({
      ok: true,
      ready,
      missing_needed,
      revenue_blockers,
      checked_at,
    });
  } catch (error) {
    console.error('Error checking launch readiness:', error);
    j500(res, { ok: false, error: 'Failed to retrieve launch readiness status.' });
  }
});

// Inlined discovery logic from scripts/site-builder-prospect-discovery.mjs
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'n'];

export default router;