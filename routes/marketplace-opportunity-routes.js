/**
 * SYNOPSIS: routes/marketplace-opportunity-routes.js
 * REST API for the Marketplace Opportunity Scanner -- submit a candidate for
 * scoring, list scored opportunities, update status.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import express from 'express';
import { recordOpportunity, listOpportunities, updateOpportunityStatus } from '../services/marketplace-opportunity-scanner.js';

export function createMarketplaceOpportunityRoutes({ pool, requireKey }) {
  const router = express.Router();

  router.post('/', requireKey, async (req, res) => {
    try {
      const { niche, source, signals, notes } = req.body || {};
      const opportunity = await recordOpportunity(pool, { niche, source, signals, notes });
      res.status(201).json({ ok: true, opportunity });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/', requireKey, async (req, res) => {
    try {
      const { status, minScore, limit } = req.query || {};
      const opportunities = await listOpportunities(pool, { status: status || null, minScore: minScore || null, limit });
      res.json({ ok: true, count: opportunities.length, opportunities });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.patch('/:id/status', requireKey, async (req, res) => {
    try {
      const { status } = req.body || {};
      const opportunity = await updateOpportunityStatus(pool, req.params.id, status);
      if (!opportunity) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, opportunity });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default createMarketplaceOpportunityRoutes;