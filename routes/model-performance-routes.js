/**
 * routes/model-performance-routes.js
 *
 * Model Performance Ledger API — exposes leaderboard, per-lens winners,
 * verdict history, and manual outcome scoring.
 *
 * GET  /api/v1/model-performance/leaderboard    — all models ranked per lens
 * GET  /api/v1/model-performance/winners        — current champion per lens
 * GET  /api/v1/model-performance/dissenters     — canary per lens (highest dissent accuracy)
 * GET  /api/v1/model-performance/lens/:lens     — verdict history for one lens
 * POST /api/v1/model-performance/score-outcome  — manually trigger outcome correlation
 *
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import { Router } from 'express';
import {
  getDissenterLeader,
  getLeaderboard,
  getLensWinners,
  getVerdictHistory,
  scoreOutcome,
} from '../services/model-performance.js';

export function createModelPerformanceRouter(pool) {
  const router = Router();

  // GET /api/v1/model-performance/leaderboard
  router.get('/leaderboard', async (_req, res) => {
    try {
      const rows = await getLeaderboard(pool);
      return res.json({ leaderboard: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/v1/model-performance/winners
  router.get('/winners', async (_req, res) => {
    try {
      const rows = await getLensWinners(pool);
      return res.json({ winners: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/v1/model-performance/dissenters
  router.get('/dissenters', async (req, res) => {
    const { lens } = req.query;
    try {
      const result = await getDissenterLeader(pool, lens || null);
      return res.json({ dissenter: result });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/v1/model-performance/lens/:lens
  router.get('/lens/:lens', async (req, res) => {
    const { limit } = req.query;
    const validLenses = ['consequences', 'time_traveler', 'trend_scout', 'great_minds', 'codebase_coherence'];
    if (!validLenses.includes(req.params.lens)) {
      return res.status(400).json({ error: `lens must be one of: ${validLenses.join(', ')}` });
    }
    try {
      const rows = await getVerdictHistory(pool, req.params.lens, limit ? parseInt(limit, 10) : 20);
      return res.json({ lens: req.params.lens, verdicts: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/v1/model-performance/score-outcome
  router.post('/score-outcome', async (req, res) => {
    const { outcome_id: outcomeId, segment_id: segmentId } = req.body;
    if (!outcomeId || !segmentId) {
      return res.status(400).json({ error: 'outcome_id and segment_id required' });
    }
    try {
      await scoreOutcome(pool, outcomeId, segmentId);
      return res.json({ ok: true, outcome_id: outcomeId, segment_id: segmentId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
