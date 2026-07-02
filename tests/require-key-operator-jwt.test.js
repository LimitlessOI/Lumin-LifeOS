/**
 * SYNOPSIS: Regression coverage for shared operator-key JWT fallback.
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createRequireKey } from '../src/server/auth/requireKey.js';
import { signToken } from '../services/lifeos-auth.js';

function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) previous[key] = process.env[key];
  Object.assign(process.env, values);
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function makeReq(headers = {}, query = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    headers: normalized,
    query,
    get(name) {
      return normalized[String(name).toLowerCase()] || null;
    },
  };
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('requireKey rejects non-operator account JWTs on operator routes', () => withEnv({
  API_KEY: 'operator-key',
  LIFEOS_JWT_SECRET: 'jwt-secret',
  LIFEOS_OPEN_ACCESS: 'false',
}, () => {
  const token = signToken({
    sub: '42',
    handle: 'member',
    role: 'member',
    exp: Date.now() + 60_000,
  });
  const req = makeReq({ authorization: `Bearer ${token}` });
  const res = makeRes();
  let nextCalled = false;

  createRequireKey({ nodeEnv: 'production' })(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.error, 'Operator access required');
}));

test('requireKey accepts operator-role account JWTs', () => withEnv({
  API_KEY: 'operator-key',
  LIFEOS_JWT_SECRET: 'jwt-secret',
  LIFEOS_OPEN_ACCESS: 'false',
}, () => {
  const token = signToken({
    sub: '1',
    handle: 'adam',
    role: 'founder_admin',
    exp: Date.now() + 60_000,
  });
  const req = makeReq({ authorization: `Bearer ${token}` });
  const res = makeRes();
  let nextCalled = false;

  createRequireKey({ nodeEnv: 'production' })(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.auth_mode, 'account_jwt');
  assert.equal(req.lifeosUser.handle, 'adam');
}));

test('requireKey still accepts configured command key headers', () => withEnv({
  API_KEY: 'operator-key',
  LIFEOS_JWT_SECRET: 'jwt-secret',
  LIFEOS_OPEN_ACCESS: 'false',
}, () => {
  const req = makeReq({ 'x-command-key': 'operator-key' });
  const res = makeRes();
  let nextCalled = false;

  createRequireKey({ nodeEnv: 'production' })(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
}));
