/**
 * SYNOPSIS: MarketingOS route ownership/security regressions.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerMarketingSessionRoutes } from '../routes/marketing-session-routes.js';
import { registerMarketingCalendarRoutes } from '../routes/marketing-calendar-routes.js';

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

function request(server, reqPath, { method = 'GET', body, headers = {} } = {}) {
  const { port } = server.address();
  const payload = body == null ? '' : JSON.stringify(body);
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
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function accountAuth(ownerId = 'owner-account') {
  return (req, _res, next) => {
    req.lifeosUser = { sub: ownerId, role: 'member' };
    req.auth_mode = 'account_jwt';
    next();
  };
}

function createMockPool() {
  const queries = [];
  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (/INSERT INTO marketing_consent_records/i.test(sql)) return { rows: [{ id: 'consent-1' }] };
      if (/INSERT INTO marketing_content_atoms/i.test(sql)) return { rows: [{ id: 'atom-1', owner_id: params[0] }] };
      return { rows: [], rowCount: 0 };
    },
  };
}

test('Marketing session routes bind owner_id to the authenticated account JWT', async (t) => {
  const app = express();
  app.use(express.json());
  const pool = createMockPool();
  registerMarketingSessionRoutes(app, {
    pool,
    requireKey: accountAuth('owner-a'),
    callCouncilMember: async () => '{}',
    logger: { error() {}, warn() {} },
  });
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/v1/marketing/consent', {
    method: 'POST',
    body: {
      owner_id: 'victim-owner',
      consent_type: 'session_recording',
      consent_text: 'I consent to this session recording.',
    },
  });

  assert.equal(res.statusCode, 201);
  const insert = pool.queries.find((q) => /INSERT INTO marketing_consent_records/i.test(q.sql));
  assert.equal(insert?.params[0], 'owner-a');
});

test('Marketing calendar atoms bind owner_id to JWT and use schema-safe consent default', async (t) => {
  const app = express();
  app.use(express.json());
  const pool = createMockPool();
  registerMarketingCalendarRoutes(app, {
    pool,
    requireKey: accountAuth('owner-b'),
    callCouncilMember: async () => ({}),
    logger: { error() {}, warn() {} },
  });
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/v1/marketing/atoms', {
    method: 'POST',
    body: {
      owner_id: 'victim-owner',
      atom_type: 'hook',
      text: 'A usable founder hook.',
    },
  });

  assert.equal(res.statusCode, 201);
  const insert = pool.queries.find((q) => /INSERT INTO marketing_content_atoms/i.test(q.sql));
  assert.equal(insert?.params[0], 'owner-b');
  assert.equal(insert?.params[6], 'session_only');
});

test('Marketing calendar rejects atom types outside the deployed schema enum', async (t) => {
  const app = express();
  app.use(express.json());
  const pool = createMockPool();
  registerMarketingCalendarRoutes(app, {
    pool,
    requireKey: accountAuth('owner-c'),
    callCouncilMember: async () => ({}),
    logger: { error() {}, warn() {} },
  });
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/v1/marketing/atoms', {
    method: 'POST',
    body: {
      atom_type: 'angle',
      text: 'This enum is not in the deployed migration.',
    },
  });

  assert.equal(res.statusCode, 400);
  assert.equal(pool.queries.length, 0);
});
