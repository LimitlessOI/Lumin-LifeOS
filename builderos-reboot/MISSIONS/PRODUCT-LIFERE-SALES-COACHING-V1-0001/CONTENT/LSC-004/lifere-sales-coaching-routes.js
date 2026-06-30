/**
 * SYNOPSIS: LifeRE sales coaching routes — simulator sessions, real-time coaching, scenario list.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { createLifeRESalesSimulator } from '../services/lifere-sales-simulator.js';

export function createLifeRESalesCoachingRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const callAI = (prompt) => callCouncilMember('claude', prompt, '', {});
  const simulator = createLifeRESalesSimulator({ pool, callAI });

  function getOwnerId(req, res, next) {
    const ownerId = req.lifeosUser?.sub || req.body?.owner_id || req.query?.owner_id || null;
    if (!ownerId) return res.status(401).json({ ok: false, error: 'owner_id_required' });
    req.ownerId = ownerId;
    next();
  }

  // GET /scenarios — list available practice scenarios
  router.get('/scenarios', requireKey, (req, res) => {
    try {
      res.json({ ok: true, scenarios: simulator.listScenarios() });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });

  // POST /session/start — start a new simulator session
  router.post('/session/start', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { scenario_id } = req.body;
      if (!scenario_id) return res.status(400).json({ ok: false, error: 'scenario_id required' });
      const result = await simulator.startSession({ ownerId: req.ownerId, scenarioId: scenario_id });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // POST /session/:id/turn — agent sends a message, receives client response + coaching note
  router.post('/session/:id/turn', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ ok: false, error: 'message required' });
      }
      const result = await simulator.agentTurn({
        sessionId: req.params.id,
        ownerId: req.ownerId,
        agentMessage: message.trim(),
      });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // POST /session/:id/end — end session, receive debrief and scores
  router.post('/session/:id/end', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const result = await simulator.endSession({
        sessionId: req.params.id,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // GET /session/:id/score — retrieve completed session scores
  router.get('/session/:id/score', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, scenario_id, status, scores, debrief, quadrant, created_at, completed_at
         FROM lifere_coaching_sessions WHERE id = $1 AND owner_id = $2`,
        [req.params.id, req.ownerId]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Session not found' });
      res.json({ ok: true, session: rows[0] });
    } catch (err) { next(err); }
  });

  // GET /sessions — list all sessions for owner
  router.get('/sessions', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, scenario_id, status, scores, quadrant, created_at, completed_at
         FROM lifere_coaching_sessions WHERE owner_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [req.ownerId]
      );
      res.json({ ok: true, sessions: rows });
    } catch (err) { next(err); }
  });

  return router;
}
