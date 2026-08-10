/**
 * SYNOPSIS: routes/android-command-routes.js -- remote command queue so the
 * LifeOS Android app can be driven from this session, not just by manual
 * taps. Same poll/claim/result shape as routes/extension-drive-routes.js's
 * pending-for-user, adapted for named app-side actions (e.g.
 * 'upload_recent_photos') instead of DOM observe/act.
 *
 * Mounted at /api/v1/android
 *   POST /command             { user, command, params? } -> { ok, command_id }
 *   GET  /pending-for-user    ?user=X -> { ok, command_id, command, params } | { ok:true, command_id:null }
 *        Atomically claims the oldest unclaimed pending command for a user.
 *   POST /command-result      { command_id, ok, result? } -> { ok }
 *
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import express from 'express';
import crypto from 'node:crypto';

async function ensureAndroidCommandSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS android_commands (
      id TEXT PRIMARY KEY,
      user_handle TEXT NOT NULL,
      command TEXT NOT NULL,
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      result JSONB,
      claimed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export function createAndroidCommandRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = logger || console;
  let schemaReady = null;

  async function ready() {
    if (!schemaReady) schemaReady = ensureAndroidCommandSchema(pool);
    await schemaReady;
  }

  router.post('/command', requireKey, async (req, res) => {
    try {
      await ready();
      const { user, command, params } = req.body || {};
      if (!String(command || '').trim()) {
        return res.status(400).json({ ok: false, error: 'command is required' });
      }
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO android_commands (id, user_handle, command, params) VALUES ($1, $2, $3, $4::jsonb)`,
        [id, user || 'adam', command, JSON.stringify(params || {})]
      );
      res.json({ ok: true, command_id: id });
    } catch (err) {
      log.error?.({ err: err.message }, '[ANDROID-COMMAND] /command failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Atomic claim: mirrors extension-drive-routes.js's /pending-for-user exactly.
  router.get('/pending-for-user', requireKey, async (req, res) => {
    try {
      await ready();
      const user = String(req.query.user || 'adam');
      const { rows } = await pool.query(
        `UPDATE android_commands
           SET claimed_at = now()
         WHERE id = (
           SELECT id FROM android_commands
            WHERE user_handle = $1 AND status = 'pending' AND claimed_at IS NULL
            ORDER BY created_at ASC LIMIT 1
         )
         RETURNING id, command, params`,
        [user]
      );
      if (!rows[0]) return res.json({ ok: true, command_id: null });
      res.json({ ok: true, command_id: rows[0].id, command: rows[0].command, params: rows[0].params });
    } catch (err) {
      log.error?.({ err: err.message }, '[ANDROID-COMMAND] /pending-for-user failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/command-result', requireKey, async (req, res) => {
    try {
      await ready();
      const { command_id, ok, result } = req.body || {};
      if (!command_id) {
        return res.status(400).json({ ok: false, error: 'command_id is required' });
      }
      await pool.query(
        `UPDATE android_commands SET status = $2, result = $3::jsonb, updated_at = now() WHERE id = $1`,
        [command_id, ok ? 'done' : 'failed', JSON.stringify(result ?? null)]
      );
      res.json({ ok: true });
    } catch (err) {
      log.error?.({ err: err.message }, '[ANDROID-COMMAND] /command-result failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default { createAndroidCommandRoutes };
