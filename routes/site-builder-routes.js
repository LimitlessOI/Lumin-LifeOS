import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES_API_KEY
import { getRegistryHealth } from '../services/env-registry-map.js';
import { rk } from '../mw/auth.js'; // Assuming rk is from this path
import { pool } from '../db/pool.js'; //

const router = Router();

// ASSUMPTION: The core discovery logic (searchGooglePlaces and SUPPORTED_TYPES) from
// scripts/site-

// Rate limiting for public/unauthenticated endpoints (if any)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes in this router, or selectively
// router.use(apiLimiter); // Apply to all, or apply per route as needed

/**
 * @api {get} /api/v1/sites/launch-readiness Get Site Builder Launch Readiness
 * @apiName GetLaunchReadiness
 * @apiGroup SiteBuilder
 * @apiPermission key
 * @apiDescription Provides a GO/NO-GO truth for the Site Builder command center based on environment variable configuration.
 *
 * @apiSuccess {Boolean} ok Always true if the request was successful.
 * @apiSuccess {Boolean} ready True if all critical and needed environment variables are set.
 * @apiSuccess {String[]} missing_needed List of names of environment variables that are 'NEEDED' but not set.
 * @apiSuccess {String[]} revenue_blockers List of names of environment variables that are 'NEEDED', not set, and revenue-blocking.
 * @apiSuccess {String} checked_at ISO timestamp when the readiness check was performed.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "ok": true,
 *       "ready": false,
 *       "missing_needed": ["SITE_BASE_URL", "POSTMARK_SERVER_TOKEN"],
 *       "revenue_blockers": ["AFFILIATE_JANE_APP_URL", "AFFILIATE_MINDBODY_URL"],
 *       "checked_at": "2024-07-30T12:34:56.789Z"
 *     }
 */
router.get('/launch-readiness', rk, async (req, res) => {
  const health = getRegistryHealth();
  const checked_at = new Date().toISOString();

  res.json({
    ok: true,
    ready: health.summary.healthy,
    missing_needed: health.missingNeeded.map(v => v.name),
    revenue_blockers: health.revenueBlockers.map(v => v.name),
    checked_at,
  });
});

export default router;