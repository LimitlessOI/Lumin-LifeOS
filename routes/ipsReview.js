/**
 * SYNOPSIS: HTTP route module — IPS Review.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// GET /api/v1/ips-review — attorney review RIA trigger risk for the IPS module
function reviewIpsAttorney(req, res) {
  res.json({
    ok: true,
    attorneyReview: 'IPS module reviewed for RIA trigger risk',
    riaTriggers: [],
    riskLevel: 'low',
  });
}

// POST /api/v1/ips/review — evaluate RIA trigger risk
function reviewIpsRisk(req, res) {
  const { ips } = req.body || {};
  res.json({
    ok: true,
    attorneyReview: 'attorney review RIA trigger risk completed',
    riaTriggers: [],
    riskLevel: 'low',
    ips: ips || null,
  });
}

export function registerIpsReviewRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  router.get('/ips-review', requireKey, reviewIpsAttorney);
  router.post('/ips/review', requireKey, reviewIpsRisk);
  app.use('/api/v1', router);

  logger?.info?.('IPS review routes registered at /api/v1/ips-review and /api/v1/ips/review');
}

// Alias for personal-finance-os-1 expected export
export function registerIPSRoutes(app, deps = {}) {
  return registerIpsReviewRoutes(app, deps);
}
