/**
 * SYNOPSIS: HTTP route module — Final PR Review.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// pull request final review endpoint
function finalReviewHandler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'Final PR review and merge for branch phase7-railway-probe',
    pullRequest: req.body || {},
  });
}

// POST /api/v1/pr/review
router.post('/review', finalReviewHandler);

export function registerFinalPrReviewRoutes(app) {
  // final PR review path for memory-system-8
  app.use('/api/v1/pr', router);
  // ready for merge — alternative mount used by memory-system-s6
  app.post('/api/v1/pr-review', finalReviewHandler);
}

export const registerFinalPRRoutes = registerFinalPrReviewRoutes;
