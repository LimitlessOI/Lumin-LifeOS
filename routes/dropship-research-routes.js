/**
 * SYNOPSIS: Dropship product research -- observes Amazon's real public
 * search results for a candidate keyword and scores real opportunity
 * signals (competition, sponsored density, margin after Amazon's real
 * referral fee). No seller credentials required for this step.
 * Mounted at /api/v1/dropship
 *   POST /research  { keyword, referralFeeRate?, fulfillmentCostUsd? }
 *     -> { ok, keyword, top_results[], opportunity_score, ... }
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { researchAmazonKeyword } from '../services/amazon-product-research.js';

export function createDropshipResearchRoutes({ requireKey, logger = console } = {}) {
  const router = express.Router();

  router.post('/research', requireKey, async (req, res) => {
    try {
      const { keyword, referralFeeRate, fulfillmentCostUsd } = req.body || {};
      if (!String(keyword || '').trim()) {
        return res.status(400).json({ ok: false, error: 'keyword required' });
      }
      const result = await researchAmazonKeyword({
        keyword,
        referralFeeRate: referralFeeRate != null ? Number(referralFeeRate) : undefined,
        fulfillmentCostUsd: fulfillmentCostUsd != null ? Number(fulfillmentCostUsd) : undefined,
        logger,
      });
      res.json(result);
    } catch (err) {
      logger.error?.('[DROPSHIP-RESEARCH] failed', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function registerDropshipResearchRoutes(app, deps = {}) {
  const { requireKey, logger = console } = deps;
  if (typeof requireKey !== 'function') {
    throw new Error('registerDropshipResearchRoutes requires requireKey');
  }
  app.use('/api/v1/dropship', createDropshipResearchRoutes({ requireKey, logger }));
  logger.info?.('✅ [DROPSHIP] Research routes mounted at /api/v1/dropship');
}

export default { createDropshipResearchRoutes, registerDropshipResearchRoutes };
