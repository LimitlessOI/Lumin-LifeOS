/**
 * SYNOPSIS: Tip-outage findings for local factory watchdog (outside Railway).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSystemWatchdog } from '../scripts/lib/system-watchdog.mjs';

test('tip db error → tip_manufacturing_down with Railway DATABASE_URL solution', () => {
  const wd = evaluateSystemWatchdog({
    tip: { ok: false, status: 503, db: 'error', readyStatus: 404 },
  });
  assert.equal(wd.ok, false);
  assert.equal(wd.findings[0].id, 'tip_manufacturing_down');
  assert.match(wd.findings[0].proposed_solution, /DATABASE_URL/);
});

test('healthy tip + healthy factory2 → ok', () => {
  const wd = evaluateSystemWatchdog({
    tip: { ok: true, status: 200, db: 'ok', readyStatus: 200 },
    factory2: { tickAt: new Date().toISOString(), taloaRunning: true },
  });
  assert.equal(wd.ok, true);
  assert.equal(wd.findings.length, 0);
});

test('lane SENTRY_FAILED is a finding with proposed_solution', () => {
  const wd = evaluateSystemWatchdog({
    tip: { ok: true, status: 200, db: 'ok', readyStatus: 200 },
    factoryId: 'factory-3',
    laneShip: {
      ok: true,
      shipped: 0,
      products: [{
        product_id: 'universal-overlay',
        ok: false,
        error: 'SENTRY_FAILED: behavior_assertion: missing:owned_',
      }],
    },
  });
  assert.equal(wd.ok, false);
  assert.equal(wd.findings.some((f) => f.id === 'lane_sentry_failed'), true);
  assert.match(wd.findings.find((f) => f.id === 'lane_sentry_failed').proposed_solution, /ship-queue-and-commit/);
});
