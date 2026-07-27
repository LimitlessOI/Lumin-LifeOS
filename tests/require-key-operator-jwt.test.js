/**
 * SYNOPSIS: Regression tests for operator-only requireKey JWT fallback.
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createRequireKey } from '../src/server/auth/requireKey.js';
import { signToken } from '../services/lifeos-auth.js';

function makeReq({ headers = {}, query = {} } = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    headers: normalizedHeaders,
    query,
    get(name) {
      return normalizedHeaders[String(name).toLowerCase()] || null;
    },
  };
}

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(middleware, req) {
  const res = makeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

function withAuthEnv(fn) {
  const previous = {
    COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY,
    LIFEOS_JWT_SECRET: process.env.LIFEOS_JWT_SECRET,
    LIFEOS_OPEN_ACCESS: process.env.LIFEOS_OPEN_ACCESS,
  };
  process.env.COMMAND_CENTER_KEY = 'test-command-key';
  process.env.LIFEOS_JWT_SECRET = 'test-jwt-secret';
  delete process.env.LIFEOS_OPEN_ACCESS;
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function tokenForRole(role) {
  return signToken({
    sub: `user-${role}`,
    handle: role,
    role,
    tier: 'core',
    iat: Date.now(),
    exp: Date.now() + 60_000,
  });
}

test('requireKey accepts configured command key headers', () => withAuthEnv(() => {
  const middleware = createRequireKey({ nodeEnv: 'production' });
  const req = makeReq({ headers: { 'x-command-key': 'test-command-key' } });
  const { res, nextCalled } = runMiddleware(middleware, req);

  assert.equal(nextCalled, true);
  assert.equal(res.body, null);
}));

test('requireKey rejects non-operator account JWTs', () => withAuthEnv(() => {
  const middleware = createRequireKey({ nodeEnv: 'production' });
  const req = makeReq({ headers: { authorization: `Bearer ${tokenForRole('member')}` } });
  const { res, nextCalled } = runMiddleware(middleware, req);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { ok: false, error: 'Operator access required' });
}));

test('requireKey accepts founder, operator, and admin account JWTs', () => withAuthEnv(() => {
  const middleware = createRequireKey({ nodeEnv: 'production' });

  for (const role of ['founder_admin', 'operator', 'admin']) {
    const req = makeReq({ headers: { authorization: `Bearer ${tokenForRole(role)}` } });
    const { res, nextCalled } = runMiddleware(middleware, req);

    assert.equal(nextCalled, true, `${role} JWT should pass`);
    assert.equal(res.body, null);
    assert.equal(req.auth_mode, 'account_jwt');
    assert.equal(req.lifeosUser.role, role);
  }
}));

test('requireKey JWT role gate is present in source (member JWT must not become operator)', () => {
  const source = fs.readFileSync(new URL('../src/server/auth/requireKey.js', import.meta.url), 'utf8');
  assert.match(source, /DEFAULT_OPERATOR_JWT_ROLES/);
  assert.match(source, /Operator access required/);
  assert.match(source, /allowedJwtRoles\.has\(role\)/);
});
