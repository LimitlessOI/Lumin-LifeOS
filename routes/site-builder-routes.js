import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES_API_KEY
import { getRegistryHealth } from '../services/env-registry-map.js';
import { rk } from '../mw/auth.js'; // Assuming rk is from this path
import { pool } from '../db/pool.js'; //

const router = Router();

// Rate limiting for public/unauthenticated routes (adjust as needed)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes in this router by default, or selectively
// router.use(apiLimiter); // Uncomment to apply to all routes

// Placeholder for existing routes (as per domain context)
// POST /api/v1/sites/build
// POST /api/v1/sites/prospect
// POST /api/v1/sites/bulk-prospect
// POST /api/v1/sites/analyze
// GET /api/v1/sites/previews
// GET /api/v1/sites/prospects
// GET /api/v1/sites/dashboard
// PATCH /api/v1/sites/prospects/:clientId/status
// POST /api/v1/sites/prospects/:clientId/follow-up (P40)
// GET /api/v1/sites/pos-partners (P41)
// GET /api/v1/sites/track-view (P42)
// POST /api/v1/sites/webhook/postmark (P44)

// New endpoint: GET /api/v1/sites/launch-readiness
router.get('/launch-readiness', rk, (req, res) => {
  const healthReport = getRegistryHealth();
  const ready = healthReport.summary.healthy;
  const missingNeeded = healthReport.missingNeeded.map(item => item.name);
  const revenueBlockers = healthReport.revenueBlockers.map(item => item.name);
  const checkedAt = new Date().toISOString();

  res.json({
    ok: true,
    ready,
    missing_needed: missingNeeded,
    revenue_blockers: revenueBlockers,
    checked_at: checkedAt,
  });
});

export default router;