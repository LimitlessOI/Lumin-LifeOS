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
  refreshOpenFindings,
  loadFindingsQueue,
  saveFindingsQueue,
  runGovernanceAuditCycle,
  runCompetitiveResearchAuditCycle,
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

test('refreshOpenFindings: stamps a deep review onto an open row without duplicating or resetting status', () => {
  const existing = {
    id: 'governed_loop_stale',
    queue_status: 'open',
    chair_status: 'approved',
    first_detected_at: '2026-08-12T22:00:00Z',
  };
  const { queue } = refreshOpenFindings(
    [{ id: 'governed_loop_stale', chair_reasoning: 'still stale — restart the loop' }],
    { findings: [existing] },
    { now: Date.parse('2026-08-12T22:15:00Z') },
  );
  assert.equal(queue.findings.length, 1);
  assert.equal(queue.findings[0].queue_status, 'open');
  assert.equal(queue.findings[0].deep_review, 'still stale — restart the loop');
  assert.equal(queue.findings[0].last_deep_review_at, '2026-08-12T22:15:00.000Z');
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
      callModel: null, // force the deterministic rule-based path — explicit, not env-dependent
      architectRoot: tmpDir, // must never default to the real repo root in a test
      logger: { info() {}, warn() {} },
      systemSignals: { governed: null, factory2: null, overlayNativeBlocks: [] },
    });

    assert.equal(result.raw_findings, 1);
    assert.equal(result.newly_added, 1);
    assert.equal(result.escalations, 1);
    assert.equal(result.queued_to_blueprint, 0, 'product_backlog findings are never approved, so Architect must not act on them');

    const persisted = loadFindingsQueue();
    assert.equal(persisted.findings.length, 1);
    assert.equal(persisted.findings[0].id, 'empty_backlog:idle-product');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: an injected callModel is actually used to enrich chair_reasoning (SO-003 — real judgment, not just the rule)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-ai-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const productsDir = path.join(tmpDir, 'docs/products');
    fs.mkdirSync(path.join(productsDir, 'idle-product'), { recursive: true });
    fs.writeFileSync(path.join(productsDir, 'idle-product/BUILD_QUEUE.json'), JSON.stringify({ steps: [{ id: '1', status: 'done' }] }));
    fs.writeFileSync(path.join(productsDir, 'idle-product/PRODUCT_HOME.md'), '# Idle\n');

    let callCount = 0;
    const fakeCallModel = async () => {
      callCount += 1;
      return 'This has sat idle for a while — worth prioritizing over lower-severity items.';
    };

    await runGovernanceAuditCycle({
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      productsDir,
      callModel: fakeCallModel,
      architectRoot: tmpDir, // must never default to the real repo root in a test
      logger: { info() {}, warn() {} },
      systemSignals: { governed: null, factory2: null, overlayNativeBlocks: [] },
    });

    assert.equal(callCount, 1, 'the injected model must actually be invoked, not silently bypassed');
    const persisted = loadFindingsQueue();
    assert.match(persisted.findings[0].chair_reasoning, /Conductor \(AI\)/);
    assert.equal(persisted.findings[0].chair_reasoning_source, 'ai_model');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: a second pass with the same finding does not re-call the model (never-stop must not burn tokens on already-open rows)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-skip-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const productsDir = path.join(tmpDir, 'docs/products');
    fs.mkdirSync(path.join(productsDir, 'idle-product'), { recursive: true });
    fs.writeFileSync(path.join(productsDir, 'idle-product/BUILD_QUEUE.json'), JSON.stringify({ steps: [{ id: '1', status: 'done' }] }));
    fs.writeFileSync(path.join(productsDir, 'idle-product/PRODUCT_HOME.md'), '# Idle\n');

    let callCount = 0;
    const fakeCallModel = async () => {
      callCount += 1;
      return 'judgment';
    };
    const opts = {
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      productsDir,
      callModel: fakeCallModel,
      architectRoot: tmpDir,
      logger: { info() {}, warn() {} },
      systemSignals: { governed: null, factory2: null, overlayNativeBlocks: [] },
    };

    const first = await runGovernanceAuditCycle(opts);
    assert.equal(first.newly_added, 1);
    assert.equal(callCount, 1);

    const second = await runGovernanceAuditCycle(opts);
    assert.equal(second.newly_added, 0);
    assert.equal(second.skipped_review, 'no_work');
    assert.equal(callCount, 1, 'already-open findings must not re-invoke Chair AI');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: system-only kind flags a stale governed loop without GitHub checks', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-system-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const result = await runGovernanceAuditCycle({
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      callModel: null,
      architectRoot: tmpDir,
      logger: { info() {}, warn() {} },
      auditKind: 'system',
      now: Date.parse('2026-08-12T22:20:00Z'),
      systemSignals: {
        governed: { enabled: true, lastTickAt: '2026-08-12T22:00:00Z', hardHalt: false },
        factory2: null,
        overlayNativeBlocks: [],
      },
    });
    assert.equal(result.raw_findings, 1);
    assert.equal(result.newly_added, 1);
    assert.equal(result.approved, 1);
    const persisted = loadFindingsQueue();
    assert.equal(persisted.findings[0].id, 'governed_loop_stale');
    assert.equal(persisted.findings[0].check, 'system_still_working');
    assert.equal(persisted.findings[0].chair_status, 'approved');
    assert.equal(persisted.findings[0].repair_lane, 'officer_panel');
    assert.equal(persisted.findings[0].architect_status, 'officer_panel');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: a simple false-block is sent as a finished conclusion, not dual-solved', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-simple-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const result = await runGovernanceAuditCycle({
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      callModel: null,
      architectRoot: tmpDir,
      logger: { info() {}, warn() {} },
      auditKind: 'system',
      now: Date.parse('2026-08-12T22:20:00Z'),
      systemSignals: {
        governed: null,
        factory2: null,
        overlayNativeBlocks: [{
          id: 'TALOA-BADGE-VOICE-001',
          target_file: 'native/macos-overlay/ContainerView.swift',
          last_error: 'NOT_ON_BLUEPRINT',
        }],
      },
    });
    assert.equal(result.newly_added, 1);
    const persisted = loadFindingsQueue();
    assert.equal(persisted.findings[0].id, 'false_block:TALOA-BADGE-VOICE-001');
    assert.equal(persisted.findings[0].repair_lane, 'send_conclusion');
    assert.equal(persisted.findings[0].conductor_status, 'accepted_sentry_conclusion');
    assert.ok(persisted.findings[0].conductor_packet.proposed_solution);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: dual-solve withholds SENTRY solution from Conductor on deep_look', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-dual-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    saveFindingsQueue({
      findings: [{
        id: 'governed_loop_stale',
        check: 'system_still_working',
        queue_status: 'open',
        chair_status: 'approved',
        first_detected_at: '2026-08-12T22:00:00Z',
        summary: 'Governed shipping lastTick is stale',
        proposed_solution: 'SECRET_SENTRY_FIX restart founder_builder only',
      }],
    });
    const prompts = [];
    const fakeStrong = async (role, prompt) => {
      prompts.push({ role, prompt: String(prompt || '') });
      if (role === 'conductor') {
        return 'Governed shipping lastTick is older than 10m. The in-process watchdog in governed-autonomous-shipping-loop should reschedule.';
      }
      return 'Still true. Kick the fixer.';
    };
    const result = await runGovernanceAuditCycle({
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      callModel: undefined,
      strongCallModel: fakeStrong,
      cheapCallModel: async () => { throw new Error('deep look must not use cheap'); },
      architectRoot: tmpDir,
      logger: { info() {}, warn() {} },
      observationTier: 'deep_look',
      now: Date.parse('2026-08-12T22:06:00Z'),
      systemSignals: {
        governed: { enabled: true, lastTickAt: '2026-08-12T21:50:00Z', hardHalt: false },
        factory2: null,
        overlayNativeBlocks: [],
      },
    });
    assert.ok(result.newly_added >= 1);
    const conductorPrompts = prompts.filter((p) => p.role === 'conductor');
    assert.equal(conductorPrompts.length, 1);
    assert.equal(conductorPrompts[0].prompt.includes('SECRET_SENTRY_FIX'), false);
    assert.equal(conductorPrompts[0].prompt.includes('proposed_solution'), false);
    const persisted = loadFindingsQueue();
    const failed = persisted.findings.find((f) => f.id === 'fixer_failed:governed_loop_stale');
    assert.ok(failed);
    assert.equal(failed.repair_lane, 'consensus_protocol');
    assert.equal(failed.sentry_solution_withheld, true);
    assert.equal(failed.conductor_status, 'hidden_alternatives_required');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runGovernanceAuditCycle: deep_look re-reads an already-open still-true finding with the strong model', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-cycle-deep-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    saveFindingsQueue({
      findings: [{
        id: 'governed_loop_stale',
        check: 'system_still_working',
        queue_status: 'open',
        chair_status: 'approved',
        first_detected_at: '2026-08-12T22:00:00Z',
        proposed_solution: 'Reschedule the in-process watchdog in governed-autonomous-shipping-loop.',
        summary: 'Governed shipping lastTick is older than 10 minutes — factory-1 is not manufacturing.',
      }],
    });
    let callCount = 0;
    const fakeStrong = async () => {
      callCount += 1;
      return 'Still stale after the cheap pass — restart the founder_builder service.';
    };
    const result = await runGovernanceAuditCycle({
      token: null,
      repo: null,
      baseUrl: null,
      commandKey: null,
      alertPhone: null,
      callModel: undefined,
      strongCallModel: fakeStrong,
      cheapCallModel: async () => { throw new Error('deep look must not use cheap'); },
      architectRoot: tmpDir,
      logger: { info() {}, warn() {} },
      observationTier: 'deep_look',
      now: Date.parse('2026-08-12T22:04:00Z'),
      systemSignals: {
        governed: { enabled: true, lastTickAt: '2026-08-12T21:50:00Z', hardHalt: false },
        factory2: null,
        overlayNativeBlocks: [],
      },
    });
    assert.equal(result.newly_added, 0);
    assert.equal(result.ai_budget.tier, 'strong');
    assert.equal(callCount, 1);
    const persisted = loadFindingsQueue();
    assert.equal(persisted.findings.length, 1);
    assert.match(persisted.findings[0].deep_review, /Chair \(AI\)|Still stale/);
    assert.ok(persisted.findings[0].last_deep_review_at);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runCompetitiveResearchAuditCycle: routes a real competitive finding through the same Chair review + persisted queue as everything else', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-audit-cycle-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const productsDir = path.join(tmpDir, 'docs/products');
    fs.mkdirSync(path.join(productsDir, 'demo-product'), { recursive: true });
    fs.writeFileSync(path.join(productsDir, 'demo-product/PRODUCT_HOME.md'), '# Demo Product\n');

    const fakeService = { searchCompetitors: async () => 'Competitor Q leads with feature R.' };

    const result = await runCompetitiveResearchAuditCycle({
      productsDir,
      cursorPath: path.join(tmpDir, 'cursor.json'),
      webSearchService: fakeService,
      callModel: null, // rule-based path, deterministic
      logger: { info() {}, warn() {} },
    });

    assert.equal(result.productId, 'demo-product');
    assert.equal(result.reviewed, true);
    assert.equal(result.added, true);

    const persisted = loadFindingsQueue();
    assert.equal(persisted.findings.length, 1);
    assert.equal(persisted.findings[0].check, 'competitive_gap');
    assert.equal(persisted.findings[0].chair_status, 'escalate_to_founder', 'competitive findings must always route to the founder, never auto-approve');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runCompetitiveResearchAuditCycle: no products found is reported honestly, does not throw', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-audit-cycle-empty-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const result = await runCompetitiveResearchAuditCycle({
      productsDir: path.join(tmpDir, 'docs/products'),
      cursorPath: path.join(tmpDir, 'cursor.json'),
      callModel: null,
      logger: { info() {}, warn() {} },
    });
    assert.equal(result.reviewed, false);
    assert.equal(result.reason, 'no_products_found');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
