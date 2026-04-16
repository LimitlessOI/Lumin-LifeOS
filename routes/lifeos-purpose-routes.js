/**
 * routes/lifeos-purpose-routes.js
 *
 * LifeOS Phase 6 — Purpose + Dream + Fulfillment API
 * Mounted at /api/v1/lifeos/purpose
 *
 * Purpose:
 *   GET  /profile           — get purpose profile
 *   POST /synthesize        — run purpose synthesis
 *   POST /energy            — log energy observation
 *   GET  /energy            — get energy observations
 *
 * Dreams:
 *   GET  /dreams            — all dreams for user
 *   POST /dreams            — create dream
 *   POST /dreams/:id/fund   — add funding
 *   POST /dreams/:id/pay-forward — record pay-forward
 *   POST /dreams/:id/complete    — complete dream
 *
 * Fulfillment:
 *   GET  /fulfillment               — pending proposals
 *   POST /fulfillment               — propose fulfillment
 *   POST /fulfillment/:id/approve   — approve order (explicit consent)
 *   POST /fulfillment/:id/cancel    — cancel order
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createPurposeDiscovery } from '../services/purpose-discovery.js';
import { createDreamFunding }     from '../services/dream-funding.js';
import { createFulfillmentEngine } from '../services/fulfillment-engine.js';

export function createLifeOSPurposeRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // Wrap callCouncilMember into a simple string-returning callAI helper
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || '';
      }
    : null;

  const purpose     = createPurposeDiscovery({ pool, callAI });
  const dreams      = createDreamFunding({ pool });
  const fulfillment = createFulfillmentEngine({ pool });

  // ── Helper: resolve user ID from handle or numeric ID ──────────────────────
  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1', [handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1', [handleOrId]);
    return rows[0]?.id || null;
  }

  // ── PURPOSE PROFILE ────────────────────────────────────────────────────────

  router.get('/profile', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const profile = await purpose.getProfile(userId);
      res.json({ ok: true, profile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/synthesize', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const profile = await purpose.synthesize(userId);
      res.json({ ok: true, profile });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/energy', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { activity, energy_effect, flow_state, notes } = req.body;
      if (!activity || !energy_effect) {
        return res.status(400).json({ ok: false, error: 'activity and energy_effect are required' });
      }
      const observation = await purpose.logEnergyObservation({
        userId,
        activity,
        energyEffect: energy_effect,
        flowState:    flow_state === true || flow_state === 'true',
        notes:        notes || null,
        source:       'manual',
      });
      res.json({ ok: true, observation });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/energy', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const days = parseInt(req.query.days, 10) || 90;
      const observations = await purpose.getEnergyObservations(userId, { days });
      res.json({ ok: true, count: observations.length, observations });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── DREAMS ─────────────────────────────────────────────────────────────────

  router.get('/dreams', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const list = await dreams.getDreams(userId);
      res.json({ ok: true, count: list.length, dreams: list });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/dreams', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { title, description, category, target_amount, target_date } = req.body;
      if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
      const dream = await dreams.createDream({
        userId,
        title,
        description:  description  || null,
        category:     category     || null,
        targetAmount: target_amount || null,
        targetDate:   target_date  || null,
      });
      res.json({ ok: true, dream });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/dreams/:id/fund', requireKey, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ ok: false, error: 'amount is required' });
      }
      const result = await dreams.updateFunding(parseInt(req.params.id, 10), parseFloat(amount));
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/dreams/:id/pay-forward', requireKey, async (req, res) => {
    try {
      const { amount, recipient } = req.body;
      if (!amount || !recipient) {
        return res.status(400).json({ ok: false, error: 'amount and recipient are required' });
      }
      const dream = await dreams.recordPayForward(parseInt(req.params.id, 10), {
        amount:    parseFloat(amount),
        recipient,
      });
      res.json({ ok: true, dream });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/dreams/:id/complete', requireKey, async (req, res) => {
    try {
      const dream = await dreams.completeDream(parseInt(req.params.id, 10));
      res.json({ ok: true, dream });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── FULFILLMENT ────────────────────────────────────────────────────────────

  router.get('/fulfillment', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const proposals = await fulfillment.getPendingProposals(userId);
      res.json({ ok: true, count: proposals.length, proposals });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/fulfillment', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { product_name, product_url, reason, estimated_price } = req.body;
      if (!product_name || !reason) {
        return res.status(400).json({ ok: false, error: 'product_name and reason are required' });
      }
      const order = await fulfillment.proposeFulfillment({
        userId,
        productName:         product_name,
        productUrl:          product_url          || null,
        reason,
        estimatedPrice:      estimated_price      || null,
        affiliateSource:     req.body.affiliate_source      || null,
        affiliateFeeEstimate: req.body.affiliate_fee_estimate || null,
      });
      res.json({ ok: true, order });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/fulfillment/:id/approve', requireKey, async (req, res) => {
    try {
      const order = await fulfillment.approveOrder(parseInt(req.params.id, 10));
      res.json({ ok: true, order });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/fulfillment/:id/cancel', requireKey, async (req, res) => {
    try {
      const order = await fulfillment.cancelOrder(parseInt(req.params.id, 10));
      res.json({ ok: true, order });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
