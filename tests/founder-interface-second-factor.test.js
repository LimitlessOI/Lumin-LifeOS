/**
 * SYNOPSIS: Regression guard for the SMS second-factor gate on shared-key
 * fallback execute actions (Phase 1.1 item "b" of the communication-first
 * blueprint). Exercises the real route factory with an in-memory mock pool,
 * not a stub of the middleware in isolation, so a refactor that silently
 * removes the gate from the route chain fails this test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';

import { createLifeOSBuilderOSCommandControlRoutes } from '../routes/lifeos-builderos-command-control-routes.js';

function makeMockPool() {
  const rows = [];
  let idCounter = 1;
  return {
    async query(sql, params = []) {
      const s = sql.trim();
      if (s.startsWith('CREATE TABLE')) return { rows: [] };
      if (s.startsWith('INSERT INTO founder_second_factor_codes')) {
        const [code, purpose, expires_at] = params;
        rows.push({ id: String(idCounter++), code, purpose, expires_at, used_at: null, created_at: new Date() });
        return { rows: [] };
      }
      if (s.includes('SELECT id FROM founder_second_factor_codes')) {
        const [code] = params;
        const match = rows
          .filter((r) => r.code === code && !r.used_at && new Date(r.expires_at) > new Date())
          .sort((a, b) => b.created_at - a.created_at)[0];
        return { rows: match ? [{ id: match.id }] : [] };
      }
      if (s.startsWith('UPDATE founder_second_factor_codes')) {
        const [id] = params;
        const row = rows.find((r) => r.id === id);
        if (row) row.used_at = new Date();
        return { rows: [] };
      }
      if (s.includes('founder_interface_fallback_auth_log')) return { rows: [] };
      throw new Error(`mock pool: unhandled query: ${s.slice(0, 80)}`);
    },
    _rows: rows,
  };
}

async function withEphemeralServer(app, fn) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const COMMAND_KEY = 'test-key-12345';

function buildApp(pool) {
  const app = express();
  app.use(express.json());
  const router = createLifeOSBuilderOSCommandControlRoutes({
    pool,
    requireKey: (req, res, next) => {
      if (req.headers['x-command-key'] === COMMAND_KEY) return next();
      return res.status(401).json({ ok: false, error: 'bad key' });
    },
    callCouncilMember: async () => 'mock-ai-response',
  });
  app.use('/api/v1/lifeos/builderos/command-control', router);
  return app;
}

test('shared-key fallback execute action requires SMS second factor, fails closed', async () => {
  process.env.COMMAND_CENTER_KEY = COMMAND_KEY;
  delete process.env.ALERT_PHONE;
  delete process.env.ADMIN_PHONE;
  process.env.ADAM_SMS_NUMBER = '+15555550123';

  const pool = makeMockPool();
  const app = buildApp(pool);

  await withEphemeralServer(app, async (base) => {
    async function post(path, body) {
      const res = await fetch(`${base}/api/v1/lifeos/builderos/command-control${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_KEY },
        body: JSON.stringify(body || {}),
      });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    }

    // No confirmation code -> blocked, a real code is generated server-side.
    const noCode = await post('/terminal-bridge/intake', { text: 'test', stage: 'system' });
    assert.equal(noCode.status, 401);
    assert.equal(noCode.json.reason, 'SECOND_FACTOR_REQUIRED');
    assert.equal(noCode.json.command_truth, 'NO_COMMAND_RAN');

    const storedCode = pool._rows.at(-1)?.code;
    assert.equal(typeof storedCode, 'string');
    assert.equal(storedCode.length, 6);

    // Wrong code -> blocked.
    const wrongCode = await post('/terminal-bridge/intake', { text: 'test', stage: 'system', confirmation_code: '000000' });
    assert.equal(wrongCode.status, 401);
    assert.equal(wrongCode.json.reason, 'SECOND_FACTOR_INVALID');

    // Correct code -> the second-factor gate lets it through (downstream may
    // still fail for unrelated reasons in this mock environment, but it must
    // not be blocked by SECOND_FACTOR_* anymore).
    const rightCode = await post('/terminal-bridge/intake', { text: 'test', stage: 'system', confirmation_code: storedCode });
    assert.equal(String(rightCode.json.reason || '').startsWith('SECOND_FACTOR'), false);

    // Same code reused -> rejected, codes are single-use.
    const reused = await post('/terminal-bridge/intake', { text: 'test', stage: 'system', confirmation_code: storedCode });
    assert.equal(reused.json.reason, 'SECOND_FACTOR_INVALID');
  });
});

test('no alert phone configured -> fails closed with a clear reason, not a silent pass', async () => {
  process.env.COMMAND_CENTER_KEY = COMMAND_KEY;
  delete process.env.ALERT_PHONE;
  delete process.env.ADMIN_PHONE;
  delete process.env.ADAM_SMS_NUMBER;

  const pool = makeMockPool();
  const app = buildApp(pool);

  await withEphemeralServer(app, async (base) => {
    const res = await fetch(`${base}/api/v1/lifeos/builderos/command-control/terminal-bridge/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_KEY },
      body: JSON.stringify({ text: 'test', stage: 'system' }),
    });
    const json = await res.json();
    assert.equal(res.status, 401);
    assert.equal(json.reason, 'SECOND_FACTOR_REQUIRED');
    assert.match(json.error, /no alert phone is configured/i);
  });
});
