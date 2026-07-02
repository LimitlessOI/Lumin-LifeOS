/**
 * SYNOPSIS: Regression coverage for LifeOS password-change authorization.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { createLifeOSAuthRoutes, canSetPasswordForHandle } from '../routes/lifeos-auth-routes.js';
import { createRequireKey } from '../src/server/auth/requireKey.js';
import { signToken } from '../services/lifeos-auth.js';

function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) previous[key] = process.env[key];
  Object.assign(process.env, values);
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

function makePool({ passwordHash = null } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/SELECT id,\s*password_hash,\s*role FROM lifeos_users/i.test(sql)) {
        return { rows: [{ id: 7, password_hash: passwordHash, role: 'member' }] };
      }
      if (/UPDATE lifeos_users SET password_hash = \$1 WHERE id = \$2/i.test(sql)) {
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

async function withAuthServer(pool, fn) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createLifeOSAuthRoutes({
    pool,
    logger: { info() {}, warn() {} },
    requireKey: createRequireKey({ nodeEnv: 'production' }),
  }));

  const server = await new Promise((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test('set-password rejects unauthenticated null-hash takeover attempts', async () => withEnv({
  API_KEY: 'operator-key',
  LIFEOS_JWT_SECRET: 'jwt-secret',
  LIFEOS_OPEN_ACCESS: 'false',
}, async () => {
  const pool = makePool();
  await withAuthServer(pool, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/auth/set-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'adam', newPassword: 'AttackerPass123!' }),
    });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.ok, false);
    assert.equal(pool.calls.length, 0);
  });
}));

test('set-password allows an authenticated user to change their own null-hash password', async () => withEnv({
  API_KEY: 'operator-key',
  LIFEOS_JWT_SECRET: 'jwt-secret',
  LIFEOS_OPEN_ACCESS: 'false',
}, async () => {
  const pool = makePool();
  const token = signToken({
    sub: '7',
    handle: 'sherry',
    role: 'member',
    exp: Date.now() + 60_000,
  });

  await withAuthServer(pool, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/auth/set-password`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ handle: 'sherry', newPassword: 'OwnerPass123!' }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(pool.calls.length, 2);
  });
}));

test('password authorization blocks cross-handle member changes', () => {
  assert.equal(
    canSetPasswordForHandle({
      lifeosUser: { sub: '7', handle: 'sherry', role: 'member' },
      targetHandle: 'adam',
    }),
    false,
  );
  assert.equal(
    canSetPasswordForHandle({
      lifeosUser: { sub: '1', handle: 'adam', role: 'founder_admin' },
      targetHandle: 'sherry',
    }),
    true,
  );
});
