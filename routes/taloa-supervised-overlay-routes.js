/**
 * SYNOPSIS: Supervised multi-session HTTP surface for the live Taloa A-to-Z
 * overlay runtime. Creates real extension-drive sessions without launching the
 * legacy autonomous browser-goal loop, lets a supervisor observe a real tab,
 * and executes only explicitly founder-approved mutations through the new A2Z
 * observe/select/act/verify adapter.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import crypto from 'node:crypto';
import express from 'express';
import { createDriveSession, stopDriveSession, getSessionState } from '../services/extension-drive-bridge.js';
import { createOverlayExtensionDriveRuntime } from '../services/taloa/overlay-extension-drive-runtime.js';

const runtimes = new Map();

async function ensureSchema(pool) {
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
  await pool.query(`ALTER TABLE extension_drive_sessions ADD COLUMN IF NOT EXISTS work_item_id TEXT`);
  await pool.query(`ALTER TABLE extension_drive_sessions ADD COLUMN IF NOT EXISTS control_mode TEXT`);
}

function isMutation(action) {
  return ['click', 'tap', 'press', 'focus', 'type', 'select', 'navigate', 'submit', 'refresh', 'back', 'forward'].includes(
    String(action?.type || '').trim().toLowerCase()
  );
}

function getRuntime(sessionId) {
  return runtimes.get(sessionId) || null;
}

export function registerTaloaSupervisedOverlayRoutes(app, deps = {}) {
  const { pool, requireKey, logger = console } = deps;
  if (!pool) throw new Error('registerTaloaSupervisedOverlayRoutes requires pool');
  if (typeof requireKey !== 'function') throw new Error('registerTaloaSupervisedOverlayRoutes requires requireKey');

  const router = express.Router();
  let schemaReady = null;
  const ready = async () => {
    if (!schemaReady) schemaReady = ensureSchema(pool);
    await schemaReady;
  };

  router.post('/start', requireKey, async (req, res) => {
    try {
      await ready();
      const {
        user = 'adam',
        goal,
        work_item_id = null,
        url = null,
      } = req.body || {};
      if (!String(goal || '').trim()) return res.status(400).json({ ok: false, error: 'goal required' });

      const sessionId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO extension_drive_sessions
           (id, user_handle, goal, start_url, allow_risky, status, work_item_id, control_mode)
         VALUES ($1, $2, $3, $4, false, 'running', $5, 'supervised_a2z')`,
        [sessionId, String(user || 'adam'), String(goal), url, work_item_id ? String(work_item_id) : null]
      );

      createDriveSession(sessionId, {
        user: String(user || 'adam'),
        goal: String(goal),
        work_item_id: work_item_id ? String(work_item_id) : null,
        control_mode: 'supervised_a2z',
      });
      runtimes.set(sessionId, createOverlayExtensionDriveRuntime({ sessionId }));

      res.json({
        ok: true,
        session_id: sessionId,
        work_item_id: work_item_id || null,
        control_mode: 'supervised_a2z',
        mutation_policy: 'explicit_founder_approval_required',
      });
    } catch (err) {
      logger.error?.({ err: err.message }, '[TALOA-SUPERVISED] start failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/observe', requireKey, async (req, res) => {
    try {
      const sessionId = String(req.query.session_id || '');
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      const runtime = getRuntime(sessionId);
      if (!runtime) return res.status(409).json({ ok: false, error: 'session_runtime_not_active' });
      const observation = await runtime.observe();
      res.json({ ok: true, session_id: sessionId, ...observation });
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  router.post('/action', requireKey, async (req, res) => {
    try {
      const {
        session_id: sessionId,
        action,
        founder_approved: founderApproved = false,
        acceptance = null,
      } = req.body || {};
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      if (!action || typeof action !== 'object') return res.status(400).json({ ok: false, error: 'action required' });
      if (isMutation(action) && founderApproved !== true) {
        return res.status(403).json({
          ok: false,
          error: 'founder_approval_required',
          proposed_action: action,
        });
      }

      const runtime = getRuntime(String(sessionId));
      if (!runtime) return res.status(409).json({ ok: false, error: 'session_runtime_not_active' });
      const result = await runtime.executeSupervisedAction({
        action,
        authorized: founderApproved === true,
        acceptance,
      });

      await ready();
      await pool.query(
        `UPDATE extension_drive_sessions
            SET steps = steps || $2::jsonb,
                updated_at = now()
          WHERE id = $1`,
        [String(sessionId), JSON.stringify([{ at: new Date().toISOString(), supervised: true, action, result: {
          ok: result.ok,
          state: result.state,
          verdict: result.verdict || null,
        } }])]
      );

      res.status(result.ok ? 200 : 409).json({ ok: result.ok, session_id: sessionId, result });
    } catch (err) {
      logger.error?.({ err: err.message }, '[TALOA-SUPERVISED] action failed');
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  router.get('/status', requireKey, async (req, res) => {
    try {
      await ready();
      const sessionId = String(req.query.session_id || '');
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      const { rows } = await pool.query(
        `SELECT id, user_handle, goal, start_url, status, work_item_id, control_mode,
                claimed_at, created_at, updated_at, steps
           FROM extension_drive_sessions WHERE id = $1`,
        [sessionId]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({
        ok: true,
        session: rows[0],
        bridge: getSessionState(sessionId),
        runtime_active: runtimes.has(sessionId),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/work-items', requireKey, async (_req, res) => {
    try {
      await ready();
      const { rows } = await pool.query(
        `SELECT id, user_handle, goal, status, work_item_id, control_mode, claimed_at, created_at, updated_at
           FROM extension_drive_sessions
          WHERE control_mode = 'supervised_a2z'
          ORDER BY created_at DESC
          LIMIT 50`
      );
      res.json({ ok: true, sessions: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/stop', requireKey, async (req, res) => {
    try {
      await ready();
      const sessionId = String(req.body?.session_id || '');
      if (!sessionId) return res.status(400).json({ ok: false, error: 'session_id required' });
      stopDriveSession(sessionId);
      runtimes.delete(sessionId);
      await pool.query(`UPDATE extension_drive_sessions SET status = 'stopped', updated_at = now() WHERE id = $1`, [sessionId]);
      res.json({ ok: true, session_id: sessionId });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/extension/a2z', router);
  logger.info?.('✅ [TALOA-SUPERVISED] A2Z supervised runtime mounted at /api/v1/extension/a2z');
}

export default registerTaloaSupervisedOverlayRoutes;
