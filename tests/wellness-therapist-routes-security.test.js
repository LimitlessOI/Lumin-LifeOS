/**
 * SYNOPSIS: Security and auth regressions for Wellness therapist routes.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerWellnessTherapistRoutes } from '../routes/wellness-therapist-routes.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function request(server, reqPath, { method = 'GET', headers = {}, body = null } = {}) {
  const { port } = server.address();
  const payload = body === null ? '' : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers: {
          ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          body: data ? JSON.parse(data) : null,
        }));
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createPool(handler) {
  return {
    calls: [],
    async query(sql, params = []) {
      this.calls.push({ sql, params });
      return handler(sql, params);
    },
  };
}

function mount({ pool, user, consentRegistry }) {
  const app = express();
  app.use(express.json());
  registerWellnessTherapistRoutes(app, {
    pool,
    requireKey: (req, _res, next) => {
      req.lifeosUser = user;
      next();
    },
    consentRegistry,
    logger: { error() {} },
  });
  return listen(app);
}

test('auto-register requireKey auth populates actor from req.lifeosUser', async (t) => {
  const pool = createPool(() => ({
    rows: [{
      id: 'profile-1',
      user_id: 42,
      display_name: 'Dr. Ada',
      approach: 'IFS',
      session_frequency: 'weekly',
      focus_areas: ['stress'],
      crisis_contact: null,
      created_at: '2026-07-12T00:00:00.000Z',
    }],
  }));
  const server = await mount({
    pool,
    user: { sub: '42', role: 'therapist' },
    consentRegistry: { hasConsent: async () => false },
  });
  t.after(() => close(server));

  const res = await request(server, '/api/v1/wellness/therapist/profile', {
    method: 'POST',
    body: { display_name: 'Dr. Ada', focus_areas: ['stress'] },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ok, true);
  assert.equal(pool.calls[0].params[0], '42');
});

test('member accounts cannot create therapist-client links', async (t) => {
  const pool = createPool(() => {
    throw new Error('database should not be touched for forbidden member');
  });
  const server = await mount({
    pool,
    user: { sub: '12', role: 'member' },
    consentRegistry: { hasConsent: async () => true },
  });
  t.after(() => close(server));

  const res = await request(server, '/api/v1/wellness/therapist/links', {
    method: 'POST',
    body: { client_user_id: '99' },
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'forbidden');
});

test('brief sharing fails closed without therapist_share consent', async (t) => {
  const pool = createPool((sql) => {
    if (/from session_briefs/i.test(sql)) {
      return {
        rows: [{
          id: '00000000-0000-0000-0000-000000000001',
          client_user_id: '99',
          therapist_user_id: '12',
          brief_json: { content: 'private' },
          client_reviewed_at: null,
          shared_at: null,
          created_at: '2026-07-12T00:00:00.000Z',
        }],
      };
    }
    if (/from therapist_client_links/i.test(sql)) {
      return { rows: [{ '?column?': 1 }] };
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  const server = await mount({
    pool,
    user: { sub: '12', role: 'therapist' },
    consentRegistry: { hasConsent: async () => false },
  });
  t.after(() => close(server));

  const res = await request(server, '/api/v1/wellness/therapist/briefs/00000000-0000-0000-0000-000000000001/share', {
    method: 'POST',
    body: { client_user_id: '99', brief: { content: 'attacker supplied replacement' } },
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'consent_required');
  assert.equal(pool.calls.some((call) => /update session_briefs/i.test(call.sql)), false);
});
