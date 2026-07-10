/**
 * SYNOPSIS: Wave 0 item 4 — boot degraded report + founder route assert tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  buildStartupDegradedReport,
  formatStartupDegradedLog,
} from '../services/founder-runtime-boot-report.js';
import {
  assertFounderRuntimeRoutes,
  routeSatisfied,
} from '../services/founder-runtime-route-assert.js';
import { listAppRoutes } from '../services/express-route-snapshot.js';

test('buildStartupDegradedReport healthy when empty', () => {
  const r = buildStartupDegradedReport({});
  assert.equal(r.degraded, false);
  assert.equal(r.status, 'healthy');
  assert.deepEqual(r.reasons, []);
});

test('buildStartupDegradedReport flags migrations, modules, routes', () => {
  const r = buildStartupDegradedReport({
    migrationFailed: ['20260101_bad.sql'],
    moduleHealth: {
      modules: [
        { module: 'routes/x.js', status: 'error', error: 'boom' },
        { module: 'routes/y.js', status: 'mounted' },
      ],
    },
    routeAssert: {
      missing_critical: ['GET /api/v1/lifeos/finance/goals'],
      missing: ['GET /api/v1/lifeos/finance/goals'],
    },
  });
  assert.equal(r.degraded, true);
  assert.ok(r.reasons.some((x) => x.startsWith('migrations_failed')));
  assert.ok(r.reasons.some((x) => x.startsWith('modules_errored')));
  assert.ok(r.reasons.some((x) => x.startsWith('routes_missing_critical')));
  assert.equal(r.modules_errored.includes('routes/x.js'), true);
  assert.deepEqual(formatStartupDegradedLog(r).tag, 'STARTUP_DEGRADED');
});

test('routeSatisfied accepts mount prefix for nested path', () => {
  const keys = new Set(['GET /api/v1/lifeos/finance']);
  assert.equal(routeSatisfied(keys, 'GET', '/api/v1/lifeos/finance/goals'), true);
  assert.equal(routeSatisfied(keys, 'GET', '/api/v1/lifeos/auth/me'), false);
});

test('assertFounderRuntimeRoutes detects missing critical route', () => {
  const app = express();
  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));
  const result = assertFounderRuntimeRoutes(app, {
    routes: [
      { method: 'GET', path: '/healthz', critical: true },
      { method: 'GET', path: '/ready', critical: true },
      { method: 'GET', path: '/api/v1/lifeos/finance/goals', critical: true },
    ],
  });
  assert.equal(result.ok, false);
  assert.ok(result.missing_critical.includes('GET /api/v1/lifeos/finance/goals'));
  assert.ok(listAppRoutes(app).some((r) => r.includes('/healthz')));
});

test('assertFounderRuntimeRoutes passes when finance mount present', () => {
  const app = express();
  const finance = express.Router();
  finance.get('/goals', (_req, res) => res.json([]));
  app.use('/api/v1/lifeos/finance', finance);
  const result = assertFounderRuntimeRoutes(app, {
    routes: [{ method: 'GET', path: '/api/v1/lifeos/finance/goals', critical: true }],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing_critical, []);
});

test('listAppRoutes + assert see app.use(router) factory mount paths', async () => {
  const { createFactoryMountRoutes } = await import('../routes/factory-mount-routes.js');
  const app = express();
  const requireKey = (_req, _res, next) => next();
  app.use(createFactoryMountRoutes({ requireKey, logger: console }));
  const listed = listAppRoutes(app);
  assert.ok(listed.includes('GET /factory/readiness'), `got: ${listed.filter((r) => r.includes('factory')).join(',')}`);
  const result = assertFounderRuntimeRoutes(app, {
    routes: [{ method: 'GET', path: '/factory/readiness', critical: true }],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing_critical, []);
});
