/**
 * SYNOPSIS: HTTP route module — Commitment Tracker (commitment tracking phase 1).
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function getCommitmentTracker(req, res) {
  res.json({
    ok: true,
    message: 'Commitment Tracker — commitment tracking phase 1 active',
    phase: 1,
  });
}

export function registerCommitmentTrackerRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  // GET /api/v1/commitment-tracker (personal-finance-os-step7)
  router.get('/commitment-tracker', requireKey, getCommitmentTracker);

  // GET /api/v1/commitment/tracker (step4 compatibility)
  router.get('/commitment/tracker', requireKey, getCommitmentTracker);

  app.use('/api/v1', router);

  logger?.info?.('Commitment Tracker routes registered at /api/v1/commitment-tracker and /api/v1/commitment/tracker');
}
