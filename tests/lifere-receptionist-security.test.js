/**
 * SYNOPSIS: Regression coverage for authenticated LifeRE Vapi tools and confined twin paths.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createLifeRERoutes } from '../routes/lifere-os-routes.js';
import {
  createLifeREReceptionistBridge,
  parseVapiToolCalls,
} from '../services/lifere-receptionist-bridge.js';
import { createLifeRETwinStore } from '../services/lifere-twin-store.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function request(server, headers = {}) {
  const { port } = server.address();
  const body = JSON.stringify({ message: { type: 'status-update' } });
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      method: 'POST',
      path: '/api/v1/lifere/receptionist/vapi-end',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

test('canonical toolWithToolCallList preserves the item name and parameters', () => {
  const calls = parseVapiToolCalls({
    message: {
      toolWithToolCallList: [{
        name: 'page_owner_now',
        toolCall: {
          id: 'tool-1',
          parameters: { caller_name: 'Caller', reason: 'urgent' },
        },
      }],
    },
  });

  assert.deepEqual(calls, [{
    id: 'tool-1',
    name: 'page_owner_now',
    args: { caller_name: 'Caller', reason: 'urgent' },
  }]);
});

test('empty toolWithToolCallList falls back to populated toolCallList', () => {
  const calls = parseVapiToolCalls({
    message: {
      toolWithToolCallList: [],
      toolCallList: [{
        id: 'tool-2',
        function: { name: 'remember_vip', arguments: '{"name":"Pat"}' },
      }],
    },
  });

  assert.equal(calls[0]?.name, 'remember_vip');
  assert.deepEqual(calls[0]?.args, { name: 'Pat' });
});

test('tool execution failures return a result instead of rejecting the webhook', async (t) => {
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    ALERT_PHONE: process.env.ALERT_PHONE,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  };
  process.env.ALERT_PHONE = '+17025550100';
  process.env.TWILIO_PHONE_NUMBER = '+17025550101';
  process.env.TWILIO_ACCOUNT_SID = 'AC_test';
  process.env.TWILIO_AUTH_TOKEN = 'test';
  globalThis.fetch = async () => { throw new Error('network down'); };
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const bridge = createLifeREReceptionistBridge({ logger: { warn() {} } });
  const result = await bridge.handleVapiWebhook({
    body: {
      message: {
        type: 'tool-calls',
        toolWithToolCallList: [{
          name: 'page_owner_now',
          toolCall: {
            id: 'tool-3',
            parameters: { caller_name: 'Caller', reason: 'urgent' },
          },
        }],
      },
    },
  });

  assert.equal(result.results[0]?.name, 'page_owner_now');
  assert.deepEqual(result.results[0]?.result, { ok: false, error: 'tool_execution_failed' });
});

test('untyped webhook bodies are acknowledged without call ingestion', () => {
  const bridge = createLifeREReceptionistBridge();
  assert.equal(bridge.normalizeVapiWebhookBody({}).should_ingest, false);
});

test('twin paths reject traversal and remain under data/twins', () => {
  const store = createLifeRETwinStore();
  assert.throws(
    () => store.twinPath({
      tenantId: '../../../../tmp',
      userId: 'pwn',
      twinKey: 'receptionist_vip',
    }),
    (error) => error?.code === 'INVALID_TWIN_PATH',
  );
  const safe = store.twinPath({
    tenantId: 'default',
    userId: 'adam',
    twinKey: 'receptionist_vip',
  });
  assert.match(safe, new RegExp(`^${path.resolve('data/twins').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${path.sep}`));
});

test('Vapi webhook fails closed without a configured header secret', async (t) => {
  const previousSecret = process.env.VAPI_WEBHOOK_SECRET;
  const previousFallback = process.env.VAPI_SECRET;
  delete process.env.VAPI_WEBHOOK_SECRET;
  delete process.env.VAPI_SECRET;

  const app = express();
  app.use(express.json());
  app.use('/api/v1/lifere', createLifeRERoutes({
    requireKey: (_req, _res, next) => next(),
    logger: { warn() {}, error() {} },
  }));
  const server = await listen(app);
  t.after(async () => {
    await close(server);
    if (previousSecret === undefined) delete process.env.VAPI_WEBHOOK_SECRET;
    else process.env.VAPI_WEBHOOK_SECRET = previousSecret;
    if (previousFallback === undefined) delete process.env.VAPI_SECRET;
    else process.env.VAPI_SECRET = previousFallback;
  });

  const missing = await request(server);
  assert.equal(missing.statusCode, 503);

  process.env.VAPI_WEBHOOK_SECRET = 'expected-secret';
  const wrong = await request(server, { 'x-vapi-secret': 'wrong-secret' });
  assert.equal(wrong.statusCode, 401);
  const accepted = await request(server, { 'x-vapi-secret': 'expected-secret' });
  assert.equal(accepted.statusCode, 200);
});
