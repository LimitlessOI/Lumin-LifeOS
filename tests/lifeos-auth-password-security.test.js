/**
 * SYNOPSIS: tests/lifeos-auth-password-security.test.js
 *
 * Regression coverage for LifeOS password-bootstrap security.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createLifeOSAuthRoutes } from '../routes/lifeos-auth-routes.js';
import { hashPassword, signToken } from '../services/lifeos-auth.js';

function createMockPool(userRow) {
  const queries = [];
  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (/SELECT id, password_hash, role FROM lifeos_users/i.test(sql)) {
        return { rows: userRow ? [userRow] : [] };
      }
      if (/UPDATE lifeos_users SET password_hash/i.test(sql)) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    },
  };
}

async function withAuthApp(pool, fn) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createLifeOSAuthRoutes({
    pool,
    logger: { info() {}, warn() {} },
    requireKey(req, res, next) {
      if (req.get('x-command-key') === 'operator-secret') return next();
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    },
  }));

  const server = app.listen(0);
  try {
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function bearerFor(handle) {
  process.env.LIFEOS_JWT_SECRET = 'lifeos-auth-password-security-test-secret';
  return `Bearer ${signToken({
    sub: '123',
    handle,
    role: 'member',
    tier: 'premium',
    iat: Date.now(),
    exp: Date.now() + 60_000,
  })}`;
}

test('set-password rejects unauthenticated passwordless bootstrap before DB access', async () => {
  const pool = createMockPool({ id: 1, password_hash: null, role: 'member' });
  await withAuthApp(pool, async (base) => {
    const res = await fetch(`${base}/auth/set-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'victim', newPassword: 'new-password-123' }),
    });

    assert.equal(res.status, 401);
    assert.equal(pool.queries.length, 0);
  });
});

test('set-password rejects account JWT attempting another handle', async () => {
  const pool = createMockPool({ id: 1, password_hash: null, role: 'member' });
  await withAuthApp(pool, async (base) => {
    const res = await fetch(`${base}/auth/set-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: bearerFor('attacker'),
      },
      body: JSON.stringify({ handle: 'victim', newPassword: 'new-password-123' }),
    });

    assert.equal(res.status, 403);
    assert.equal(pool.queries.length, 0);
  });
});

test('set-password rejects passwordless same-user change without operator bootstrap', async () => {
  const pool = createMockPool({ id: 1, password_hash: null, role: 'member' });
  await withAuthApp(pool, async (base) => {
    const res = await fetch(`${base}/auth/set-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: bearerFor('victim'),
      },
      body: JSON.stringify({ handle: 'victim', newPassword: 'new-password-123' }),
    });

    assert.equal(res.status, 403);
    assert.equal(pool.queries.length, 1);
    assert.ok(!/UPDATE lifeos_users SET password_hash/i.test(pool.queries.at(-1).sql));
  });
});

test('set-password preserves authenticated self-service with current password', async () => {
  const pool = createMockPool({ id: 1, password_hash: hashPassword('old-password-123'), role: 'member' });
  await withAuthApp(pool, async (base) => {
    const res = await fetch(`${base}/auth/set-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: bearerFor('victim'),
      },
      body: JSON.stringify({
        handle: 'victim',
        currentPassword: 'old-password-123',
        newPassword: 'new-password-123',
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(pool.queries.filter((q) => /UPDATE lifeos_users SET password_hash/i.test(q.sql)).length, 1);
  });
});

test('set-password allows operator-key bootstrap for passwordless users', async () => {
  const pool = createMockPool({ id: 1, password_hash: null, role: 'member' });
  await withAuthApp(pool, async (base) => {
    const res = await fetch(`${base}/auth/set-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-command-key': 'operator-secret',
      },
      body: JSON.stringify({ handle: 'victim', newPassword: 'new-password-123' }),
    });

    assert.equal(res.status, 200);
    assert.equal(pool.queries.filter((q) => /UPDATE lifeos_users SET password_hash/i.test(q.sql)).length, 1);
  });
});

test('forgot-password does not disclose tip_reset_token for fake operator headers', async () => {
  const previous = {
    COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY,
    API_KEY: process.env.API_KEY,
    LIFEOS_KEY: process.env.LIFEOS_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    WORK_EMAIL: process.env.WORK_EMAIL,
    WORK_EMAIL_APP_PASSWORD: process.env.WORK_EMAIL_APP_PASSWORD,
  };
  process.env.COMMAND_CENTER_KEY = 'real-operator-key';
  delete process.env.API_KEY;
  delete process.env.LIFEOS_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.WORK_EMAIL;
  delete process.env.WORK_EMAIL_APP_PASSWORD;

  const queries = [];
  const pool = {
    queries,
    async query(sql) {
      queries.push(sql);
      if (/SELECT id, email, user_handle FROM lifeos_users/i.test(sql)) {
        return { rows: [{ id: 9, email: 'victim@example.com', user_handle: 'victim' }] };
      }
      if (/INSERT INTO lifeos_password_resets/i.test(sql)) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    },
  };

  try {
    await withAuthApp(pool, async (base) => {
      const res = await fetch(`${base}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-command-key': 'not-the-real-key',
        },
        body: JSON.stringify({ email: 'victim@example.com', return_token: true }),
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.tip_reset_token, undefined);
    });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
