/**
 * SYNOPSIS: Regression guard, written 2026-07-19 while wiring scripts/ci-health-watchdog.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'http';

import { loadAutoRegisterRegistry, autoRegisterProductModules } from '../startup/auto-register-product-modules.js';

/**
 * Regression guard, written 2026-07-19 while wiring scripts/ci-health-watchdog.mjs
 * to routes/founder-sms-routes.js for critical-alert SMS/calls. A static grep for
 * "registerFounderSmsRoutes(" as a JS call site initially (and wrongly) suggested
 * this route was never mounted anywhere — the mistake was that this codebase wires
 * some modules dynamically via config/auto-registered-product-modules.json
 * (startup/auto-register-product-modules.js reads the registry and calls
 * `regFn(app, deps)` by name at runtime), which a plain JS-file grep can't see.
 * founder-sms-routes.js was in fact already registered there and enabled.
 * This test exists so that fact stays true and provable by actual HTTP round-trip
 * (module-imports-without-throwing is not proof of reachability — only a real
 * request/response is), not by re-grepping and getting it wrong again.
 */

async function withEphemeralServer(app, fn) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('founder-sms-routes.js is present and enabled in the auto-register registry', () => {
  const modules = loadAutoRegisterRegistry();
  const entry = modules.find((m) => m.path === 'routes/founder-sms-routes.js');
  assert.ok(entry, 'routes/founder-sms-routes.js must be registered in config/auto-registered-product-modules.json');
  assert.equal(entry.enabled, true);
  assert.equal(entry.register, 'registerFounderSmsRoutes');
});

test('founder-sms-routes.js mounts cleanly via the real auto-register pipeline', async () => {
  const app = express();
  app.use(express.json());
  const passthroughRequireKey = (_req, _res, next) => next();

  const results = await autoRegisterProductModules(
    app,
    { requireKey: passthroughRequireKey, logger: { info() {}, warn() {} } },
    { logger: { info() {}, warn() {} }, modules: loadAutoRegisterRegistry().filter((m) => m.path === 'routes/founder-sms-routes.js') }
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'mounted', results[0].error || 'expected mounted status');
});

test('POST /api/v1/lifeos/founder/sms is actually reachable (not 404) once mounted', async () => {
  const app = express();
  app.use(express.json());
  const passthroughRequireKey = (_req, _res, next) => next();

  await autoRegisterProductModules(
    app,
    { requireKey: passthroughRequireKey, logger: { info() {}, warn() {} } },
    { logger: { info() {}, warn() {} }, modules: loadAutoRegisterRegistry().filter((m) => m.path === 'routes/founder-sms-routes.js') }
  );

  await withEphemeralServer(app, async (baseUrl) => {
    const resp = await fetch(`${baseUrl}/api/v1/lifeos/founder/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: '+15551234567', body: 'test' }),
    });
    // Without real Twilio creds this must fail with a clean 503 ("Twilio not
    // configured"), never a 404 — 404 would mean the route isn't actually mounted.
    assert.notEqual(resp.status, 404, 'route must be mounted, not 404');
    const json = await resp.json();
    assert.equal(json.ok, false);
    assert.match(json.error, /Twilio/i);
  });
});

test('POST /api/v1/lifeos/founder/voice/call is actually reachable (not 404) once mounted', async () => {
  const app = express();
  app.use(express.json());
  const passthroughRequireKey = (_req, _res, next) => next();

  await autoRegisterProductModules(
    app,
    { requireKey: passthroughRequireKey, logger: { info() {}, warn() {} } },
    { logger: { info() {}, warn() {} }, modules: loadAutoRegisterRegistry().filter((m) => m.path === 'routes/founder-sms-routes.js') }
  );

  await withEphemeralServer(app, async (baseUrl) => {
    const resp = await fetch(`${baseUrl}/api/v1/lifeos/founder/voice/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: '+15551234567', say: 'test' }),
    });
    assert.notEqual(resp.status, 404, 'route must be mounted, not 404');
    const json = await resp.json();
    assert.equal(json.ok, false);
    assert.match(json.error, /Twilio/i);
  });
});
