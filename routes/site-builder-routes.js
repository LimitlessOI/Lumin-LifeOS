import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES

// Import the health check service
import { getRegistryHealth } from '../services/env-registry-map.js';

const router = Router();

// The original file only had imports. Assuming other routes would be added here.
// For this task, we only add the launch-readiness endpoint.

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * GET /api/v1/sites/launch-readiness
 * Returns the launch readiness status for the Site Builder, based on environment variable configuration.
 */
router.get('/launch-readiness', async (req, res) => {
  const checked_at = new Date().toISOString();
  const healthReport = getRegistryHealth();

  // Extract names of revenue blockers and missing needed variables
  const revenueBlockerNames = healthReport.revenueBlockers.map(item => item.name);
  const missingNeededNames = healthReport.missingNeeded.map(item => item.name);

  // Determine overall readiness
  const ready = revenueBlockerNames.length === 0 && missingNeededNames.length === 0;

  res.json({
    ok: true,
    ready,
    missing_needed: missingNeededNames,
    revenue_blockers: revenueBlockerNames,
    checked_at,
  });
});

export default router;