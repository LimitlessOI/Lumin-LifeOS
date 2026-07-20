/**
 * SYNOPSIS: LifeRE sales coaching routes — simulator sessions, real-time coaching, scenario list.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { createLifeRESalesSimulator } from '../services/lifere-sales-simulator.js';

export function createLifeRESalesCoachingRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const callAI = async (prompt) => {
    const attempts = [
      {
        member: 'openai_gpt',
        options: {
          founderComms: true,
          taskType: 'general',
          model: process.env.OPENAI_LIFERE_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          maxTokens: 1200,
          temperature: 0.4,
          useCache: false,
        },
      },
      {
        member: 'gemini_flash',
        options: {
          founderComms: true,
          taskType: 'general',
          maxTokens: 1200,
          temperature: 0.4,
          useCache: false,
        },
      },
    ];

    const errors = [];
    for (const attempt of attempts) {
      try {
        const response = await callCouncilMember(attempt.member, prompt, attempt.options);
        return typeof response === 'string'
          ? response
          : String(response?.content || response?.text || response?.message || '');
      } catch (error) {
        const detail = `${attempt.member}: ${error.message}`;
        errors.push(detail);
        logger?.warn?.({ attempt: attempt.member, error: error.message }, '[LIFERE-SALES-COACH] AI fallback failed');
      }
    }

    throw new Error(`lifere_sales_coaching_ai_unavailable: ${errors.join(' | ')}`);
  };
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

/**
 * Auto-register wrapper (loader contract: register(app, deps) mounts itself).
 * The full-runtime lane mounts this at /api/v1/lifere/sales-coach, but Railway
 * boots the founder_builder lane only — so without this the simulator 404'd in
 * prod (SENTRY LifeRE probe: GET /api/v1/lifere/sales-coach/scenarios → 404).
 * Mounted here via auto-register (no composition-root edit; startup/ is protected).
 */
export function registerLifereSalesCoachingRoutes(app, deps = {}) {
  const { pool, requireKey, callCouncilMember, logger } = deps;
  app.use(
    '/api/v1/lifere/sales-coach',
    createLifeRESalesCoachingRoutes({ pool, requireKey, callCouncilMember, logger })
  );
  logger?.info?.('✅ [LIFERE-SALES-COACH] Founder-builder routes mounted at /api/v1/lifere/sales-coach');
}