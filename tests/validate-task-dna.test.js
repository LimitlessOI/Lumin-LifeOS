/**
 * SYNOPSIS: S4 Task DNA v0 — validator unit tests
 * S4 Task DNA v0 — validator unit tests
 *
 * Tests validateTaskDNA() and formatReport() against real queue files.
 * Warn-only — missing DNA never fails the test suite.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTaskDNA, formatReport } from '../scripts/validate-task-dna.mjs';

test('validateTaskDNA: returns results for all three lanes', async () => {
  const report = await validateTaskDNA();
  assert.equal(report.results.length, 3, 'should have 3 lane results');
  const lanes = report.results.map((r) => r.lane);
  assert.ok(lanes.includes('LIFEOS_DASHBOARD_BUILDER_QUEUE'), 'missing dashboard queue');
  assert.ok(lanes.includes('SITE_BUILDER_AUTONOMOUS_QUEUE'), 'missing site builder queue');
  assert.ok(lanes.includes('TC_SERVICE_BUILDER_QUEUE'), 'missing TC service queue');
});

test('validateTaskDNA: grandTotal reflects actual task count', async () => {
  const report = await validateTaskDNA();
  // Total tasks across all 3 lanes (28 + 11 + 5 = 44 at time of writing — allows for growth)
  assert.ok(report.grandTotal >= 44, `expected >= 44 tasks, got ${report.grandTotal}`);
});

test('validateTaskDNA: dashboard queue has at least 1 DNA-populated task', async () => {
  const report = await validateTaskDNA();
  const dashboard = report.results.find((r) => r.lane === 'LIFEOS_DASHBOARD_BUILDER_QUEUE');
  assert.ok(dashboard, 'dashboard lane not found');
  assert.ok(dashboard.populated >= 1, `expected >= 1 populated task, got ${dashboard.populated}`);
});

test('validateTaskDNA: populated task has nextTaskDNA info', async () => {
  const report = await validateTaskDNA();
  const dashboard = report.results.find((r) => r.lane === 'LIFEOS_DASHBOARD_BUILDER_QUEUE');
  assert.ok(dashboard.nextTaskDNA, 'nextTaskDNA should be set when at least one task has DNA');
  assert.equal(typeof dashboard.nextTaskDNA.id, 'string', 'nextTaskDNA.id should be a string');
  assert.ok(Array.isArray(dashboard.nextTaskDNA.present), 'nextTaskDNA.present should be an array');
  assert.ok(dashboard.nextTaskDNA.present.length >= 1, 'should have at least one present DNA field');
});

test('validateTaskDNA: grandPopulated + grandMissing = grandTotal', async () => {
  const report = await validateTaskDNA();
  assert.equal(
    report.grandPopulated + report.grandMissing,
    report.grandTotal,
    'populated + missing must equal total',
  );
});

test('formatReport: produces non-empty string with lane names', async () => {
  const report = await validateTaskDNA();
  const text = formatReport(report);
  assert.equal(typeof text, 'string');
  assert.ok(text.includes('LIFEOS_DASHBOARD_BUILDER_QUEUE'), 'report missing dashboard lane');
  assert.ok(text.includes('TOTAL:'), 'report missing TOTAL line');
  assert.ok(text.includes('warn-only'), 'report missing warn-only notice');
});
