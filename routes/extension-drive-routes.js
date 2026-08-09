/**
 * SYNOPSIS: routes/extension-drive-routes.js -- Universal Overlay live driving
 * channel. Lets the server drive Adam's REAL browser tab through the extension
 * (not a server-side headless Puppeteer session) by reusing the generic
 * observe->decide->act->verify loop from services/general-browser-agent.js
 * with a poll/post bridge adapter (services/extension-drive-bridge.js)
 * instead of Puppeteer. Adam watches his own tab; his own real confirmation
 * is the goal-verification evidence -- never a self-reported model claim.
 *
 * Mounted at /api/v1/extension/drive
 *   POST /start    { user, goal, url?, expectedSiteHost?, allowRiskyActions?, maxSteps? } -> { ok, session_id }
 *   GET  /next      ?session_id=X -> { ok, pending, status }   (frame polls this)
 *   POST /result     { session_id, payload } -> { ok }          (frame posts result/observation back)
 *   POST /stop        { session_id } -> { ok }
 *   GET  /status      ?session_id=X -> { ok, session }
 *   GET  /pending-for-user  ?user=X -> { ok, session_id, goal } | { ok:true, session_id:null }
 *        Atomically claims (and returns) the newest unclaimed running session
 *        for a user, so an already-open browser tab can auto-start driving
 *        without anyone clicking Start -- the server starts the session, the
 *        tab's own short poll picks it up on its own.
 *
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import express from 'express';
import crypto from 'node:crypto';
import { runBrowserGoal } from '../services/general-browser-agent.js';
import { makeDecider, makeAccountConfirmer } from '../services/general-browser-agent-runtime.js';
import {
  createDriveSession,
  getSessionState,
  stopDriveSession,
  peekPendingRequest,
  resolvePendingRequest,
  makeExtensionObserve,
  makeExtensionAct,
  makeExtensionVerify,
} from '../services/extension-drive-bridge.js';

async function ensureDriveSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS extension_drive_sessions (
      id TEXT PRIMARY KEY,
      user_handle TEXT NOT NULL,
      goal TEXT NOT NULL,
      start_url TEXT,
      allow_risky BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'running',
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      result JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function makeCallModel(callCouncilMember) {
  const TIER_MODELS = { cheap: 'claude-haiku-4-5-20251001', strong: 'claude-sonnet-5' };
  return async function callModel(tier, prompt) {
    const model = TIER_MODELS[tier] || TIER_MODELS.cheap;
    const reply = await callCouncilMember('anthropic', {
      model,
      system: 'You are a browser-automation planner driving a real browser tab on behalf of its owner. Given the current page observation, respond with ONLY a single JSON action object of the form {"type":"navigate|click|type|wait|done|give_up", ...fields}. Never invent a selector that was not listed in Elements.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });
    return reply?.content?.[0]?.text || reply?.text || '';
  };
}

export function createExtensionDriveRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();
  const log = logger || console;
  let schemaReady = null;

  async function ready() {
    if (!schemaReady) schemaReady = ensureDriveSchema(pool);
    await schemaReady;
  }

  router.post('/start', requireKey, async (req, res) => {
    try {
      await ready();
      const { user, goal, url = null, expectedSiteHost = null, allowRiskyActions = false, maxSteps = 20 } = req.body || {};
      if (!String(goal || '').trim()) return res.status(400).json({ ok: false, error: 'goal required' });

      const sessionId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO extension_drive_sessions (id, user_handle, goal, start_url, allow_risky, status)
         VALUES ($1, $2, $3, $4, $5, 'running')`,
        [sessionId, user || 'adam', goal, url, !!allowRiskyActions]
      );
      createDriveSession(sessionId, { user: user || 'adam', goal });

      const observe = makeExtensionObserve(sessionId);
      const act = makeExtensionAct(sessionId);
      const verifyGoal = makeExtensionVerify(sessionId);
      const decideAction = makeDecider({ callModel: makeCallModel(callCouncilMember), tiers: ['cheap', 'strong'] });
      const confirmContext = expectedSiteHost ? makeAccountConfirmer({ expectSiteHost: expectedSiteHost }) : null;

      const onStep = async (rec) => {
        try {
          await pool.query(
            `UPDATE extension_drive_sessions SET steps = steps || $2::jsonb, updated_at = now() WHERE id = $1`,
            [sessionId, JSON.stringify([rec])]
          );
        } catch (e) {
          log.warn({ err: e.message }, '[EXT-DRIVE] onStep persist failed');
        }
      };

      runBrowserGoal({
        goal,
        startUrl: url,
        expectedContext: expectedSiteHost ? { site: expectedSiteHost } : null,
        observe,
        decideAction,
        act,
        verifyGoal,
        confirmContext,
        onStep,
        maxSteps: Math.min(Number(maxSteps) || 20, 40),
        allowRiskyActions: !!allowRiskyActions,
      })
        .then(async (result) => {
          await pool.query(
            `UPDATE extension_drive_sessions SET status = $2, result = $3::jsonb, updated_at = now() WHERE id = $1`,
            [sessionId, result.ok ? 'done' : 'failed', JSON.stringify(result)]
          );
        })
        .catch(async (err) => {
          log.error({ err: err.message }, '[EXT-DRIVE] runBrowserGoal crashed');
          await pool.query(
            `UPDATE extension_drive_sessions SET status = 'failed', result = $2::jsonb, updated_at = now() WHERE id = $1`,
            [sessionId, JSON.stringify({ ok: false, reason: `crashed:${err.message}` })]
          );
        });

      res.json({ ok: true, session_id: sessionId });
    } catch (err) {
      log.error({ err: err.message }, '[EXT-DRIVE] /start failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/next', requireKey, (req, res) => {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
    const result = peekPendingRequest(sessionId);
    if (result.error) return res.status(404).json({ ok: false, error: result.error });
    res.json({ ok: true, pending: result.pending, status: getSessionState(sessionId)?.status || 'unknown' });
  });

  router.post('/result', requireKey, (req, res) => {
    const { session_id, payload } = req.body || {};
    if (!session_id) return res.status(400).json({ ok: false, error: 'session_id required' });
    const resolved = resolvePendingRequest(session_id, payload ?? {});
    res.json({ ok: resolved });
  });

  router.post('/stop', requireKey, async (req, res) => {
    try {
      const { session_id } = req.body || {};
      if (!session_id) return res.status(400).json({ ok: false, error: 'session_id required' });
      stopDriveSession(session_id);
      await pool.query(`UPDATE extension_drive_sessions SET status = 'stopped', updated_at = now() WHERE id = $1`, [session_id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/status', requireKey, async (req, res) => {
    try {
      const sessionId = req.query.session_id;
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      const { rows } = await pool.query(`SELECT * FROM extension_drive_sessions WHERE id = $1`, [sessionId]);
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, session: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Atomic claim: an already-open browser tab polls this on its own, with no
  // click required, so a session the server starts (e.g. via a direct API
  // call) gets picked up and driven automatically.
  router.get('/pending-for-user', requireKey, async (req, res) => {
    try {
      await ready();
      const user = String(req.query.user || 'adam');
      const { rows } = await pool.query(
        `UPDATE extension_drive_sessions
           SET claimed_at = now()
         WHERE id = (
           SELECT id FROM extension_drive_sessions
            WHERE user_handle = $1 AND status = 'running' AND claimed_at IS NULL
            ORDER BY created_at DESC LIMIT 1
         )
         RETURNING id, goal`,
        [user]
      );
      if (!rows[0]) return res.json({ ok: true, session_id: null });
      res.json({ ok: true, session_id: rows[0].id, goal: rows[0].goal });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default { createExtensionDriveRoutes };