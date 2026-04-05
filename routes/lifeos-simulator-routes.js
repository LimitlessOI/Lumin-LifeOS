/**
 * routes/lifeos-simulator-routes.js
 *
 * Future Self Simulator API
 * Mounted at /api/v1/lifeos/simulator
 *
 * POST /project                — single projection for one horizon
 * POST /project/multiple       — multiple horizons in one call
 * POST /project/compare        — compare commitment levels side-by-side
 * POST /sessions               — log a practice session
 * GET  /velocity/:domain       — get current velocity for a domain
 * GET  /history/:domain        — get projection history for a domain
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createFutureSimulator } from '../services/future-self-simulator.js';

export function createLifeOSSimulatorRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ─────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  const simulator = createFutureSimulator({ pool, callAI });

  // ── Helper: resolve user_id ───────────────────────────────────────────────
  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1', [+handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1', [handleOrId]);
    return rows[0]?.id || null;
  }

  // ── POST /project ─────────────────────────────────────────────────────────
  // Single projection for one commitment level + horizon.
  // Body: { user?, domain, currentBaseline, commitmentLevel, targetHorizonDays }
  router.post('/project', requireKey, async (req, res) => {
    try {
      const { user, domain, currentBaseline, commitmentLevel, targetHorizonDays } = req.body || {};

      if (!domain)              return res.status(400).json({ ok: false, error: 'domain is required' });
      if (!currentBaseline)     return res.status(400).json({ ok: false, error: 'currentBaseline is required' });
      if (!commitmentLevel)     return res.status(400).json({ ok: false, error: 'commitmentLevel is required' });
      if (!targetHorizonDays)   return res.status(400).json({ ok: false, error: 'targetHorizonDays is required' });

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const projection = await simulator.project(userId, {
        domain,
        currentBaseline,
        commitmentLevel,
        targetHorizonDays: parseInt(targetHorizonDays),
      });

      res.status(201).json({ ok: true, projection });
    } catch (err) {
      const status = err.message.includes('Invalid domain') ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /project/multiple ────────────────────────────────────────────────
  // Multiple horizons in one call.
  // Body: { user?, domain, currentBaseline, commitmentLevel, horizons }
  router.post('/project/multiple', requireKey, async (req, res) => {
    try {
      const { user, domain, currentBaseline, commitmentLevel, horizons } = req.body || {};

      if (!domain)           return res.status(400).json({ ok: false, error: 'domain is required' });
      if (!currentBaseline)  return res.status(400).json({ ok: false, error: 'currentBaseline is required' });
      if (!commitmentLevel)  return res.status(400).json({ ok: false, error: 'commitmentLevel is required' });
      if (!Array.isArray(horizons) || horizons.length === 0) {
        return res.status(400).json({ ok: false, error: 'horizons must be a non-empty array of day counts' });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const projections = await simulator.projectMultiple(userId, {
        domain,
        currentBaseline,
        commitmentLevel,
        horizons: horizons.map(Number),
      });

      res.status(201).json({ ok: true, projections });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /project/compare ─────────────────────────────────────────────────
  // Compare multiple commitment levels at a fixed horizon.
  // Body: { user?, domain, currentBaseline, horizon, levels: [{minutesPerDay, label}] }
  router.post('/project/compare', requireKey, async (req, res) => {
    try {
      const { user, domain, currentBaseline, horizon, levels } = req.body || {};

      if (!domain)            return res.status(400).json({ ok: false, error: 'domain is required' });
      if (!currentBaseline)   return res.status(400).json({ ok: false, error: 'currentBaseline is required' });
      if (!horizon)           return res.status(400).json({ ok: false, error: 'horizon is required' });
      if (!Array.isArray(levels) || levels.length === 0) {
        return res.status(400).json({ ok: false, error: 'levels must be a non-empty array of {minutesPerDay, label}' });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const comparisons = await simulator.compareCommitmentLevels(userId, {
        domain,
        currentBaseline,
        horizon: parseInt(horizon),
        levels,
      });

      res.json({ ok: true, comparisons });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sessions ────────────────────────────────────────────────────────
  // Log a practice session.
  // Body: { user?, domain, durationMinutes, qualityScore?, notes? }
  router.post('/sessions', requireKey, async (req, res) => {
    try {
      const { user, domain, durationMinutes, qualityScore, notes } = req.body || {};

      if (!domain)          return res.status(400).json({ ok: false, error: 'domain is required' });
      if (!durationMinutes) return res.status(400).json({ ok: false, error: 'durationMinutes is required' });

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const session = await simulator.logPracticeSession(userId, {
        domain,
        durationMinutes: parseInt(durationMinutes),
        qualityScore:    qualityScore != null ? parseFloat(qualityScore) : null,
        notes:           notes || null,
      });

      res.status(201).json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /velocity/:domain ─────────────────────────────────────────────────
  // Get current practice velocity for a domain.
  router.get('/velocity/:domain', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const velocity = await simulator.getVelocity(userId, req.params.domain);
      res.json({ ok: true, domain: req.params.domain, velocity });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /history/:domain ──────────────────────────────────────────────────
  // Get projection history for a domain.
  router.get('/history/:domain', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const history = await simulator.getProjectionHistory(userId, req.params.domain);
      res.json({ ok: true, domain: req.params.domain, history, count: history.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
