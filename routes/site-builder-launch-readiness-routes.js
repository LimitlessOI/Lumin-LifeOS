/**
 * SYNOPSIS: @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
// @ssot docs/products/site-builder/PRODUCT_HOME.md
// Launch Readiness Routes — Provides an endpoint to check system readiness.
import { Router } from 'express';
import { getRegistryHealth } from '../services/env-registry-map.js';

export default function createLaunchReadinessRoutes(app, { requireKey }) {
  const router = Router();

  router.get('/launch-readiness', requireKey, async (req, res) => {
    const healthReport = getRegistryHealth();
    const revenueBlockers = (healthReport.revenueBlockers || []).map(i => i.name);
    const missingNeeded = (healthReport.missingNeeded || []).map(i => i.name);
    const missingCritical = (healthReport.missingCritical || []).map(i => i.name);

    res.json({
      ok: true,
      ready: healthReport.summary.healthy,
      revenue_blockers: revenueBlockers,
      missing_needed: missingNeeded.concat(missingCritical),
      checked_at: new Date().toISOString(),
    });
  });

  app.use('/api/v1/sites', router);
}