/**
 * SYNOPSIS: js — tests/sentry-chair-governance-audit.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  mergeFindingsIntoQueue,
  loadFindingsQueue,
  saveFindingsQueue,
  runGovernanceAuditCycle,
} from '../scripts/sentry-chair-governance-audit.mjs';

test('mergeFindingsIntoQueue: a genuinely new finding is appended with queue_status open', () => {
  const finding = { id: 'ci_health:x:abc', check: 'ci_health', chair_status: 'approved' };
  const { queue, newlyAdded } = mergeFindingsIntoQueue([finding], { findings: [] });
  assert.equal(queue.findings.length, 1);
  assert.equal(queue.findings[0].queue_status, 'open');
  assert.equal(newlyAdded.length, 1);
});

test('mergeFindingsIntoQueue: an already-open finding (same id) is left untouched, not duplicated or reset', () => {
  const existing = { id: 'empty_backlog:lifeos', check: 'product_backlog', chair_status: 'escalate_to_founder', queue_status: 'acknowledged', acknowledged_at: '2026-07-01T00:00:00Z' };
  const rerun = { id: 'empty_backlog:lifeos', check: 'product_backlog', chair_status: 'escalate_to_founder' };

  const { queue, newlyAdded } = mergeFindingsIntoQueue([rerun], { findings: [existing] });
  assert.equal(queue.findings.length, 1);
  assert.equal(queue.findings[0].queue_status, 'acknowledged', 'must not overwrite a human-set status');
  assert.equal(queue.findings[0].acknowledged_at, '2026-07-01T00:00:00Z');
  assert.equal(newlyAdded.length, 0);
});

test('mergeFindingsIntoQueue: a finding no longer detected is NOT auto-removed from the queue', () => {
  const existing = { id: 'ci_health:x:old-sha', check: 'ci_health', chair_status: 'approved', queue_status: 'open' };
  const { queue } = mergeFindingsIntoQueue([], { findings: [existing] });
  assert.equal(queue.findings.length, 1, 'closing a finding requires a human/Architect confirming the fix, not just one audit pass missing it');
});

test('loadFindingsQueue/saveFindingsQueue: round-trips through an isolated cwd', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-queue-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    assert.deepEqual(loadFindingsQueue(), { findings: [] });
    saveFindingsQueue({ findings: [{ id: 'x' }] });
    assert.deepEqual(loadFindingsQueue(), { findings: [{ id: 'x' }] });
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: runs end-to-end in an isolated cwd with no GitHub credentials, no throw, persists real product-backlog findings', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const productsDir = path.join(tmpDir, 'docs/products');
    fs.mkdirSync(path.join(productsDir, 'idle-product'), { recursive: true });
    fs.writeFileSync(path.join(productsDir, 'idle-product/BUILD_QUEUE.json'), JSON.stringify({ steps: [{ id: '1', status: 'done' }] }));
    fs.writeFileSync(path.join(productsDir, 'idle-product/PRODUCT_HOME.md'), '# Idle\n');

    // No GITHUB_TOKEN/GITHUB_REPO/PUBLIC_BASE_URL/COMMAND_CENTER_KEY -> the
    // GitHub-touching checks and the SMS escalation both no-op cleanly; this
    // proves the cycle degrades gracefully with zero credentials rather than
    // throwing (the exact class of failure that would silently break a
    // scheduled job in a differently-configured environment).
    const result = await runGovernanceAuditCycle({
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      productsDir,
      logger: { info() {}, warn() {} },
    });

    assert.equal(result.raw_findings, 1);
    assert.equal(result.newly_added, 1);
    assert.equal(result.escalations, 1);

    const persisted = loadFindingsQueue();
    assert.equal(persisted.findings.length, 1);
    assert.equal(persisted.findings[0].id, 'empty_backlog:idle-product');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
