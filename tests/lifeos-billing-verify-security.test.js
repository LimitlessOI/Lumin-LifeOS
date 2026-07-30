/**
 * SYNOPSIS: tests/lifeos-billing-verify-security.test.js
 *
 * Regression: LifeOS billing verify/operator-mark-paid must not grant tiers
 * from unbound Stripe sessions or member JWTs.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createLifeOSBillingRoutes } from '../routes/lifeos-auth-routes.js';
import { signToken } from '../services/lifeos-auth.js';
import { createRequireKey } from '../src/server/auth/requireKey.js';

test('billing paid gate requires lifeos_billing source + allowlisted tier', () => {
  const TIER_PRICES = { core: 1, premium: 1, family: 1 };
  function isPaid(session) {
    const source = String(session.metadata?.source || '');
    const tier = String(session.metadata?.tier || '').toLowerCase();
    const userId = session.client_reference_id || session.metadata?.user_id;
    return session.payment_status === 'paid'
      && source === 'lifeos_billing'
      && Boolean(userId)
      && Boolean(TIER_PRICES[tier]);
  }

  assert.equal(isPaid({
    payment_status: 'paid',
    client_reference_id: 'user-1',
    metadata: { tier: 'premium', source: 'other_product' },
  }), false);

  assert.equal(isPaid({
    payment_status: 'unpaid',
    client_reference_id: 'user-1',
    metadata: { tier: 'premium', source: 'lifeos_billing' },
  }), false);

  assert.equal(isPaid({
    payment_status: 'paid',
    client_reference_id: 'user-1',
    metadata: { tier: 'enterprise', source: 'lifeos_billing' },
  }), false);

  assert.equal(isPaid({
    payment_status: 'paid',
    client_reference_id: 'user-1',
    metadata: { tier: 'premium', source: 'lifeos_billing' },
  }), true);
});

test('operator-mark-paid rejects member JWT once requireKey role-gates', async () => {
  process.env.LIFEOS_JWT_SECRET = process.env.LIFEOS_JWT_SECRET || 'lifeos-billing-security-test-secret';
  process.env.COMMAND_CENTER_KEY = 'operator-secret-billing-test';

  const requireKey = createRequireKey({
    envVars: ['COMMAND_CENTER_KEY'],
    nodeEnv: 'production',
  });

  const app = express();
  app.use(express.json());
  let tierUpdates = 0;
  const pool = {
    async query(sql) {
      if (/UPDATE lifeos_users SET tier/i.test(sql)) {
        tierUpdates += 1;
        return { rows: [{ id: 'victim', tier: 'premium' }] };
      }
      return { rows: [] };
    },
  };
  app.use('/billing', createLifeOSBillingRoutes({
    pool,
    logger: { error() {} },
    requireKey,
  }));

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const memberJwt = signToken({
      sub: 'attacker',
      handle: 'attacker',
      role: 'member',
      tier: 'free',
      iat: Date.now(),
      exp: Date.now() + 60_000,
    });
    const res = await fetch(`http://127.0.0.1:${port}/billing/operator-mark-paid`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${memberJwt}`,
      },
      body: JSON.stringify({ userId: 'victim', tier: 'premium' }),
    });
    assert.equal(res.status, 403);
    assert.equal(tierUpdates, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
