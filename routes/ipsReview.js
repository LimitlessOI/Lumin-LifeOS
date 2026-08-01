/**
 * SYNOPSIS: HTTP route module — IPS Review.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
import express from 'express';
import { reviewIPSRisk } from '../services/ipsReview.js';

export function registerIpsReviewRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;
  const router = express.Router();

  // GET /api/v1/ips-review — attorney review RIA trigger risk for the IPS module
  router.get('/ips-review', requireKey, async (req, res, next) => {
    try {
      const { id } = req.query;
      const result = await reviewIPSRisk(deps, { id });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/ips/review — evaluate RIA trigger risk
  router.post('/ips/review', requireKey, async (req, res, next) => {
    try {
      const { id, ips } = req.body || {};
      const result = await reviewIPSRisk(deps, { id, ips });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/v1', router);

  logger?.info?.('IPS review routes registered at /api/v1/ips-review and /api/v1/ips/review');
}

// Alias for BUILD_QUEUE personal-finance-os-1 expected export
export function registerIPSRoutes(app, deps = {}) {
  return registerIpsReviewRoutes(app, deps);
}

// Backward-compatible alias used by system-build output
export function registerIpsReview(app, deps = {}) {
  return registerIpsReviewRoutes(app, deps);
}
