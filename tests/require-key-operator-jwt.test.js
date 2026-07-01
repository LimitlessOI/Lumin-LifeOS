/**
 * SYNOPSIS: Regression coverage for operator-only JWT fallback in requireKey.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequireKey } from '../src/server/auth/requireKey.js';
import { signToken } from '../services/lifeos-auth.js';

const ORIGINAL_ENV = {
  API_KEY: process.env.API_KEY,
  COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY,
  LIFEOS_KEY: process.env.LIFEOS_KEY,
  LIFEOS_JWT_SECRET: process.env.LIFEOS_JWT_SECRET,
  LIFEOS_OPEN_ACCESS: process.env.LIFEOS_OPEN_ACCESS,
  NODE_ENV: process.env.NODE_ENV,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function configureAuthEnv() {
  process.env.NODE_ENV = 'production';
  process.env.COMMAND_CENTER_KEY = 'operator-secret';
  process.env.LIFEOS_JWT_SECRET = 'jwt-secret';
  delete process.env.API_KEY;
  delete process.env.LIFEOS_KEY;
  delete process.env.LIFEOS_OPEN_ACCESS;
}

function makeReq({ headers = {}, query = {} } = {}) {
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

function runMiddleware(middleware, req) {
  const result = {
    nextCalled: false,
    statusCode: null,
    body: null,
  };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  middleware(req, res, () => {
    result.nextCalled = true;
  });
  return result;
}

function jwtFor(role) {
  return signToken({
    sub: '123',
    handle: role,
    role,
    tier: 'core',
    exp: Date.now() + 60_000,
  });
}

test.afterEach(() => {
  restoreEnv();
});

test('requireKey still accepts the configured command key', () => {
  configureAuthEnv();
  const requireKey = createRequireKey();
  const req = makeReq({ headers: { 'x-command-key': 'operator-secret' } });

  const result = runMiddleware(requireKey, req);

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test('requireKey rejects member account JWTs on operator routes', () => {
  configureAuthEnv();
  const requireKey = createRequireKey();
  const token = jwtFor('member');
  const req = makeReq({ headers: { authorization: `Bearer ${token}` } });

  const result = runMiddleware(requireKey, req);

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.body?.error, 'OPERATOR_ROLE_REQUIRED');
});

test('requireKey accepts operator account JWTs on operator routes', () => {
  configureAuthEnv();
  const requireKey = createRequireKey();
  const token = jwtFor('operator');
  const req = makeReq({ headers: { authorization: `Bearer ${token}` } });

  const result = runMiddleware(requireKey, req);

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
  assert.equal(req.auth_mode, 'account_jwt');
  assert.equal(req.lifeosUser?.role, 'operator');
});
