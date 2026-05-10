/**
 * routes/site-builder-routes.js
 * Site Builder public API — launch readiness + pipeline stats.
 *
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 */
import { Router } from 'express';
import { getRegistryHealth } from '../services/env-registry-map.js';

const router = Router();

router.get('/launch-readiness', async (req, res) => {
  const healthReport = getRegistryHealth();
  const revenueBlockers = (healthReport.revenueBlockers || []).map(i => i.name);
  const missingNeeded = (healthReport.missingNeeded || []).map(i => i.name);
  res.json({
    ok: true,
    ready: revenueBlockers.length === 0 && missingNeeded.length === 0,
    revenue_blockers: revenueBlockers,
    missing_needed: missingNeeded,
    checked_at: new Date().toISOString(),
  });
});

export default router;
