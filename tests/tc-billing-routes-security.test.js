/**
 * SYNOPSIS: Security regressions for TC billing routes.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerTcBillingRoutes } from '../routes/tcBillingRoutes.mjs';

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

function request(server, reqPath, { method = 'GET', headers = {}, body = '' } = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers: {
          ...(body ? { 'content-length': Buffer.byteLength(body) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function requireKey(req, res, next) {
  if (req.get('x-command-key') === 'test-key') return next();
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

function createPool() {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push({ sql, params });
      if (/information_schema\.columns/i.test(sql)) {
        return {
          rows: [
            { column_name: 'id', data_type: 'integer' },
            { column_name: 'event_id', data_type: 'text' },
            { column_name: 'event_type', data_type: 'text' },
            { column_name: 'payload', data_type: 'jsonb' },
            { column_name: 'created_at', data_type: 'timestamp with time zone' },
          ],
        };
      }
      if (/FROM tc_billing_subscriptions/i.test(sql)) {
        return {
          rows: [
            {
              id: 'sub-1',
              agent_id: 'agent-1',
              status: 'active',
              payload: { plan_tier: 'founding' },
              created_at: '2026-07-10T00:00:00Z',
              updated_at: '2026-07-10T00:00:00Z',
            },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    },
  };
}

function createApp(deps = {}) {
  const app = express();
  app.use(express.json());
  const pool = deps.pool || createPool();
  registerTcBillingRoutes(app, {
    pool,
    requireKey,
    callCouncilMember: deps.callCouncilMember || (async () => '{}'),
    validateWebhookSignature: deps.validateWebhookSignature,
    logger: { error() {}, info() {} },
  });
  return { app, pool };
}

test('billing status is not readable without credentials', async (t) => {
  const { app, pool } = createApp();
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/tc/billing/status/agent-1');

  assert.equal(res.statusCode, 401);
  assert.equal(pool.queries.length, 0);
});

test('billing status still works with credentials', async (t) => {
  const { app, pool } = createApp();
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/tc/billing/status/agent-1', {
    headers: { 'x-command-key': 'test-key' },
  });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /founding/);
  assert.equal(pool.queries.length, 1);
});

test('billing webhook fails closed when signature validation is unavailable', async (t) => {
  let councilCalls = 0;
  const { app, pool } = createApp({
    callCouncilMember: async () => {
      councilCalls += 1;
      return '{}';
    },
  });
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/tc/billing/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 'test-signature',
    },
    body: JSON.stringify({ id: 'evt_attack', type: 'customer.subscription.updated' }),
  });

  assert.equal(res.statusCode, 503);
  assert.equal(councilCalls, 0);
  assert.equal(pool.queries.length, 0);
});

test('billing webhook rejects invalid signatures before side effects', async (t) => {
  const { app, pool } = createApp({
    validateWebhookSignature: async () => {
      const error = new Error('bad signature');
      error.statusCode = 400;
      throw error;
    },
  });
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/tc/billing/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 'bad-signature',
    },
    body: JSON.stringify({ id: 'evt_attack', type: 'customer.subscription.updated' }),
  });

  assert.equal(res.statusCode, 400);
  assert.equal(pool.queries.length, 0);
});

test('billing webhook records only a verified Stripe event', async (t) => {
  const { app, pool } = createApp({
    validateWebhookSignature: async () => ({
      id: 'evt_verified',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_verified' } },
    }),
  });
  const server = await listen(app);
  t.after(() => close(server));

  const res = await request(server, '/api/tc/billing/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 'good-signature',
    },
    body: JSON.stringify({ ignored: 'body is not trusted until verifier returns event' }),
  });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /evt_verified/);
  assert.equal(pool.queries.length, 2);
  assert.match(pool.queries[1].sql, /INSERT INTO stripe_webhook_events \(event_id, event_type, payload\)/);
  assert.deepEqual(pool.queries[1].params.slice(0, 2), [
    'evt_verified',
    'customer.subscription.updated',
  ]);
});
