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
  await pool.query(`ALTER TABLE extension_drive_sessions ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE extension_drive_sessions ADD COLUMN IF NOT EXISTS handoff JSONB`);
}

function makeCallModel(callCouncilMember) {
  const SYSTEM_PREFIX = 'You are a browser-automation planner driving a real browser tab on behalf of its owner. Given the current page observation, respond with ONLY a single JSON action object of the form {"type":"navigate|click|type|wait|done|give_up", ...fields}. Never invent a selector that was not listed in Elements.\n\n';
  return async function callModel(tier, prompt) {
    const reply = await callCouncilMember(tier, SYSTEM_PREFIX + prompt, { taskType: 'browser_agent' });
    return typeof reply === 'string' ? reply : (reply?.text || reply?.content || '');
  };
}

export function createExtensionDriveRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();
  const log = logger || console;
  let schemaReady = null;

  // CORS: content.js's auto-pickup poll runs inside the HOST PAGE (e.g.
  // fiverr.com), not the extension's own origin, so its fetch() calls are
  // cross-origin. Every route here is protected by requireKey (a secret
  // header a random page can't forge), so a permissive origin is safe.
  router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-command-key, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

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
      const decideAction = makeDecider({ callModel: makeCallModel(callCouncilMember), tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'] });
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

      // HANDOFF: when the same click/type action repeats with zero page change
      // twice in a row, the AI is stuck on something only the real account
      // owner can supply (a verification code, a CAPTCHA answer, an OTP) --
      // stop cleanly and surface exactly which field needs a human value,
      // instead of burning the rest of the step budget re-clicking it.
      const onAfterStep = async ({ history, stuck, stuckCount, observation }) => {
        if (!stuck || stuckCount < 2) return { stop: false };
        const last = history[history.length - 1];
        const action = last?.action;
        if (!action || (action.type !== 'click' && action.type !== 'type')) return { stop: false };
        const el = (observation?.elements || []).find((e) => e.selector === action.selector);
        const label = (el && (el.text || el.label)) || action.reason || action.selector || 'this field';
        return {
          stop: true,
          ok: false,
          reason: 'handoff_needed',
          handoff: { selector: action.selector, label: String(label), url: observation?.url || null },
        };
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
        onAfterStep,
        maxSteps: Math.min(Number(maxSteps) || 20, 40),
        allowRiskyActions: !!allowRiskyActions,
      })
        .then(async (result) => {
          const status = result.handoff ? 'handoff' : (result.ok ? 'done' : 'failed');
          await pool.query(
            `UPDATE extension_drive_sessions SET status = $2, result = $3::jsonb, handoff = $4::jsonb, updated_at = now() WHERE id = $1`,
            [sessionId, status, JSON.stringify(result), result.handoff ? JSON.stringify(result.handoff) : null]
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

  // HANDOFF RESUME: Adam typed the value the stuck step needed (a verification
  // code, a CAPTCHA answer). Type it into the exact field the handoff pointed
  // at using the same extension act() adapter, then resume the goal loop from
  // the resulting page state so the AI takes back over immediately.
  router.post('/handoff-resume', requireKey, async (req, res) => {
    try {
      await ready();
      const { session_id, value } = req.body || {};
      if (!session_id || value == null || String(value).trim() === '') {
        return res.status(400).json({ ok: false, error: 'session_id and value required' });
      }
      const { rows } = await pool.query(`SELECT * FROM extension_drive_sessions WHERE id = $1`, [session_id]);
      const session = rows[0];
      if (!session) return res.status(404).json({ ok: false, error: 'not_found' });
      if (session.status !== 'handoff' || !session.handoff) {
        return res.status(409).json({ ok: false, error: 'no_pending_handoff' });
      }

      createDriveSession(session_id, { user: session.user_handle, goal: session.goal });
      const observe = makeExtensionObserve(session_id);
      const act = makeExtensionAct(session_id);
      const verifyGoal = makeExtensionVerify(session_id);

      await act({ type: 'type', selector: session.handoff.selector, text: String(value) });

      await pool.query(
        `UPDATE extension_drive_sessions SET status = 'running', handoff = NULL, updated_at = now() WHERE id = $1`,
        [session_id]
      );
      res.json({ ok: true });

      const decideAction = makeDecider({ callModel: makeCallModel(callCouncilMember), tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'] });
      const onStep = async (rec) => {
        try {
          await pool.query(
            `UPDATE extension_drive_sessions SET steps = steps || $2::jsonb, updated_at = now() WHERE id = $1`,
            [session_id, JSON.stringify([rec])]
          );
        } catch (e) {
          log.warn({ err: e.message }, '[EXT-DRIVE] onStep persist failed');
        }
      };
      const onAfterStep = async ({ history, stuck, stuckCount, observation }) => {
        if (!stuck || stuckCount < 2) return { stop: false };
        const last = history[history.length - 1];
        const action = last?.action;
        if (!action || (action.type !== 'click' && action.type !== 'type')) return { stop: false };
        const el = (observation?.elements || []).find((e) => e.selector === action.selector);
        const label = (el && (el.text || el.label)) || action.reason || action.selector || 'this field';
        return {
          stop: true,
          ok: false,
          reason: 'handoff_needed',
          handoff: { selector: action.selector, label: String(label), url: observation?.url || null },
        };
      };

      runBrowserGoal({
        goal: session.goal,
        startUrl: null,
        expectedContext: null,
        observe,
        decideAction,
        act,
        verifyGoal,
        confirmContext: null,
        onStep,
        onAfterStep,
        maxSteps: 20,
        allowRiskyActions: !!session.allow_risky,
      })
        .then(async (result) => {
          const status = result.handoff ? 'handoff' : (result.ok ? 'done' : 'failed');
          await pool.query(
            `UPDATE extension_drive_sessions SET status = $2, result = $3::jsonb, handoff = $4::jsonb, updated_at = now() WHERE id = $1`,
            [session_id, status, JSON.stringify(result), result.handoff ? JSON.stringify(result.handoff) : null]
          );
        })
        .catch(async (err) => {
          log.error({ err: err.message }, '[EXT-DRIVE] handoff-resume runBrowserGoal crashed');
          await pool.query(
            `UPDATE extension_drive_sessions SET status = 'failed', result = $2::jsonb, updated_at = now() WHERE id = $1`,
            [session_id, JSON.stringify({ ok: false, reason: `crashed:${err.message}` })]
          );
        });
    } catch (err) {
      log.error({ err: err.message }, '[EXT-DRIVE] /handoff-resume failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default { createExtensionDriveRoutes };