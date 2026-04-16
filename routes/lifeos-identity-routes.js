/**
 * routes/lifeos-identity-routes.js
 *
 * LifeOS Identity Intelligence — API Routes
 * Mounted at /api/v1/lifeos/identity
 *
 * Endpoints:
 *   POST /scan?user=adam                     — run contradiction scan
 *   GET  /contradictions?user=adam           — all contradictions
 *   GET  /contradictions?user=adam&acknowledged=false — unacknowledged only
 *   POST /contradictions/:id/acknowledge     — acknowledge a contradiction
 *   POST /belief-archaeology                 — surface the belief behind a pattern
 *   GET  /beliefs?user=adam                  — all belief patterns
 *   POST /beliefs/:id/update                 — update a belief
 *   POST /stress-test                        — run identity stress test
 *   GET  /stress-test?user=adam              — get latest stress test
 *   POST /honest-witness                     — run honest witness session
 *   GET  /honest-witness?user=adam           — get past witness sessions
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createContradictionEngine } from '../services/contradiction-engine.js';

export function createLifeOSIdentityRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();

  // callAI adapter — normalized string response from council
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  const engine = createContradictionEngine({ pool, callAI, logger });

  // Helper: resolve user_id from handle (e.g. "adam") or numeric id
  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1', [handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1', [handleOrId]);
    return rows[0]?.id || null;
  }

  // ── Contradiction Engine ──────────────────────────────────────────────────

  // POST /scan?user=adam
  // Runs the full contradiction scan for a user.
  router.post('/scan', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const contradictions = await engine.scan(userId);
      res.json({ ok: true, contradictions, count: contradictions.length });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] POST /scan error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /contradictions?user=adam[&acknowledged=false]
  router.get('/contradictions', requireKey, async (req, res) => {
    try {
      const { user = 'adam', acknowledged } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const opts = {};
      if (acknowledged !== undefined) {
        opts.acknowledged = acknowledged === 'true' || acknowledged === '1';
      }

      const contradictions = await engine.getContradictions(userId, opts);
      res.json({ ok: true, contradictions, count: contradictions.length });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] GET /contradictions error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /contradictions/:id/acknowledge
  // Body: { user: "adam", response: "..." }
  router.post('/contradictions/:id/acknowledge', requireKey, async (req, res) => {
    try {
      const { user = 'adam', response } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const row = await engine.acknowledgeContradiction({
        contradictionId: parseInt(req.params.id),
        userId,
        response: response || null,
      });

      if (!row) return res.status(404).json({ ok: false, error: 'Contradiction not found' });
      res.json({ ok: true, contradiction: row });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] POST /contradictions/:id/acknowledge error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Belief Archaeology ────────────────────────────────────────────────────

  // POST /belief-archaeology
  // Body: { user: "adam", pattern_description: "cancelled gym 4 times" }
  router.post('/belief-archaeology', requireKey, async (req, res) => {
    try {
      const { user = 'adam', pattern_description } = req.body;
      if (!pattern_description) {
        return res.status(400).json({ ok: false, error: 'pattern_description is required' });
      }

      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const result = await engine.runBeliefArchaeology({
        userId,
        patternDescription: pattern_description,
      });

      res.json({ ok: true, belief: result.belief, question: result.question });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] POST /belief-archaeology error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /beliefs?user=adam
  router.get('/beliefs', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const beliefs = await engine.getBeliefs(userId);
      res.json({ ok: true, beliefs, count: beliefs.length });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] GET /beliefs error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /beliefs/:id/update
  // Body: { updated_belief: "..." }
  router.post('/beliefs/:id/update', requireKey, async (req, res) => {
    try {
      const { updated_belief } = req.body;
      if (!updated_belief) {
        return res.status(400).json({ ok: false, error: 'updated_belief is required' });
      }

      const row = await engine.updateBelief({
        beliefId: parseInt(req.params.id),
        updatedBelief: updated_belief,
      });

      if (!row) return res.status(404).json({ ok: false, error: 'Belief not found' });
      res.json({ ok: true, belief: row });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] POST /beliefs/:id/update error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Identity Stress Test ──────────────────────────────────────────────────

  // POST /stress-test
  // Body: { user: "adam" }
  router.post('/stress-test', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const review = await engine.runIdentityStressTest(userId);
      res.json({ ok: true, review });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] POST /stress-test error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /stress-test?user=adam
  router.get('/stress-test', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const review = await engine.getLatestStressTest(userId);
      res.json({ ok: true, review: review || null });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] GET /stress-test error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Honest Witness ────────────────────────────────────────────────────────

  // POST /honest-witness
  // Body: { user: "adam" }
  router.post('/honest-witness', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const { session, witnessText } = await engine.runHonestWitnessSession(userId);
      res.json({ ok: true, session, witnessText });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] POST /honest-witness error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /honest-witness?user=adam
  router.get('/honest-witness', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const sessions = await engine.getWitnessSessions(userId);
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      logger.error({ err }, '[lifeos-identity] GET /honest-witness error');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
