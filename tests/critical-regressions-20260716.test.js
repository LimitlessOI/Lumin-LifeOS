/**
 * SYNOPSIS: Regression coverage for founder chat, password reset, commitment capture, and SMOS checkout security fixes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createLifeOSAuthRoutes } from '../routes/lifeos-auth-routes.js';
import { createLifeOSAuth } from '../services/lifeos-auth.js';
import { captureCommitment } from '../services/lifeos-commitment-service.js';
import { runLuminChairTurn } from '../services/lumin-chair-orchestrator.js';
import { isMatchingPaidSmosPackCheckout } from '../services/smos-pack-checkout.js';

test('founder chair turn reaches routing without a channel temporal-dead-zone crash', async () => {
  const result = await runLuminChairTurn({
    cleanedInput: 'Show the current system status.',
    normalizedText: 'Show the current system status.',
    sourceMode: 'text',
    conversationalMode: true,
    explicitAction: 'display',
    shouldDisplayOnly: true,
    explicitExecute: false,
    conversationHistory: [],
    alphaProbe: true,
  }, {
    async buildDisplayBundle() {
      return { scope: 'system_status' };
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.chair_channel, 'display');
});

test('forgot-password rejects arbitrary API-key presence before creating a reset token', async (t) => {
  let queryCount = 0;
  const pool = {
    async query() {
      queryCount += 1;
      return { rows: [] };
    },
  };
  const requireKey = (req, res, next) => {
    if (req.get('x-command-key') === 'real-operator-key') return next();
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/lifeos/auth', createLifeOSAuthRoutes({ pool, requireKey }));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/lifeos/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'attacker-controlled-value',
    },
    body: JSON.stringify({ email: 'victim@example.com', return_token: true }),
  });

  assert.equal(response.status, 401);
  assert.equal(queryCount, 0);
  assert.equal((await response.json()).tip_reset_token, undefined);
});

test('password reset consumes its token under lock and revokes refresh sessions atomically', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(String(sql).replace(/\s+/g, ' ').trim());
      if (/SELECT id, user_id FROM lifeos_password_resets/.test(sql)) {
        return { rows: [{ id: 17, user_id: 42 }] };
      }
      return { rows: [] };
    },
    release() {
      statements.push('RELEASE');
    },
  };
  const auth = createLifeOSAuth({
    async connect() {
      return client;
    },
  });

  assert.deepEqual(
    await auth.resetPasswordWithToken({ token: 'one-time-token', newPassword: 'new-password-123' }),
    { ok: true },
  );
  assert.ok(statements.some((sql) => /FOR UPDATE/.test(sql)));
  assert.ok(statements.some((sql) => /DELETE FROM lifeos_sessions WHERE user_id = \$1/.test(sql)));
  assert.ok(statements.includes('COMMIT'));
  assert.equal(statements.at(-1), 'RELEASE');
});

test('commitment capture awaits parsed values before inserting', async () => {
  let inserted = null;
  const db = {
    async query(_sql, params) {
      inserted = params;
      return {
        rows: [{
          user_id: params[0],
          title: params[1],
          datetime: params[2],
        }],
      };
    },
  };

  const result = await captureCommitment(
    db,
    'Dentist tomorrow at 2pm',
    { userId: 42, timezone: 'America/New_York' },
  );

  assert.equal(inserted[0], 42);
  assert.equal(inserted[1], 'Dentist');
  assert.match(inserted[2], /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(result.title, 'Dentist');
});

test('SMOS checkout validation rejects cross-product and incomplete payments', () => {
  const valid = {
    mode: 'payment',
    payment_status: 'paid',
    metadata: {
      product: 'smos-content-pack',
      marketing_session_id: 'marketing-session-1',
    },
  };

  assert.equal(isMatchingPaidSmosPackCheckout(valid, 'marketing-session-1'), true);
  assert.equal(isMatchingPaidSmosPackCheckout({
    ...valid,
    metadata: { product: 'site-builder-publish' },
  }, 'marketing-session-1'), false);
  assert.equal(isMatchingPaidSmosPackCheckout({
    ...valid,
    metadata: {},
  }, 'marketing-session-1'), false);
  assert.equal(isMatchingPaidSmosPackCheckout({
    ...valid,
    payment_status: 'unpaid',
    status: 'complete',
  }, 'marketing-session-1'), false);
  assert.equal(isMatchingPaidSmosPackCheckout(valid, 'different-session'), false);
});
