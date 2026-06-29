/**
 * SYNOPSIS: C09 Build Closure Contract — unit tests
 * C09 Build Closure Contract — unit tests
 *
 * Tests buildClosureRecord() (pure function — no network, no DB).
 * Also emits one synthetic closure_contract_result to prove the log shape is valid.
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildClosureRecord, validateClosureRecord } from '../scripts/lib/closure-contract.mjs';

// ── committed_success ─────────────────────────────────────────────────────────

test('committed_success: valid record', () => {
  const rec = buildClosureRecord({
    closureType: 'committed_success',
    taskId: 'test-task-1',
    lane: 'TEST_LANE',
    proof: { ok: true, committed: true, commit_sha: 'abc123', model_used: 'gemini_flash' },
    okToAdvance: true,
  });
  assert.equal(rec.event, 'closure_contract_result');
  assert.equal(rec.closure_type, 'committed_success');
  assert.equal(rec.ok_to_advance, true);
  assert.equal(rec.proof.committed, true);
  assert.equal(typeof rec.task_id, 'string');
  const v = validateClosureRecord(rec);
  assert.equal(v.valid, true, v.reason);
});

test('committed_success: throws if ok=false', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'committed_success',
        taskId: 'x',
        lane: 'L',
        proof: { ok: false, committed: true },
        okToAdvance: true,
      }),
    /committed_success requires/,
  );
});

test('committed_success: throws if committed=false', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'committed_success',
        taskId: 'x',
        lane: 'L',
        proof: { ok: true, committed: false },
        okToAdvance: true,
      }),
    /committed_success requires/,
  );
});

test('committed_success: throws if okToAdvance=false', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'committed_success',
        taskId: 'x',
        lane: 'L',
        proof: { ok: true, committed: true },
        okToAdvance: false,
      }),
    /must have okToAdvance=true/,
  );
});

// ── skipped_already_valid ─────────────────────────────────────────────────────

test('skipped_already_valid: valid record (SIS1)', () => {
  const rec = buildClosureRecord({
    closureType: 'skipped_already_valid',
    taskId: 'sis1-task',
    lane: 'LIFEOS_DASHBOARD_BUILDER_QUEUE',
    proof: { target_file: 'services/foo.js', line_count: 42, validator: 'node_check' },
    okToAdvance: true,
  });
  assert.equal(rec.closure_type, 'skipped_already_valid');
  assert.equal(rec.ok_to_advance, true);
  assert.equal(rec.proof.validator, 'node_check');
  const v = validateClosureRecord(rec);
  assert.equal(v.valid, true, v.reason);
});

test('skipped_already_valid: throws if target_file missing', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'skipped_already_valid',
        taskId: 'x',
        lane: 'L',
        proof: { validator: 'node_check' },
        okToAdvance: true,
      }),
    /skipped_already_valid requires/,
  );
});

// ── explicit_noncommit_reason ─────────────────────────────────────────────────

test('explicit_noncommit_reason: hard fail (okToAdvance=false)', () => {
  const rec = buildClosureRecord({
    closureType: 'explicit_noncommit_reason',
    taskId: 'hard-fail-task',
    lane: 'FORGE_LANE',
    proof: { committed: false, reason: 'hard_fail_queue_stop', http: 502 },
    okToAdvance: false,
  });
  assert.equal(rec.closure_type, 'explicit_noncommit_reason');
  assert.equal(rec.ok_to_advance, false);
  const v = validateClosureRecord(rec);
  assert.equal(v.valid, true, v.reason);
});

test('explicit_noncommit_reason: syntax quarantine (okToAdvance=true)', () => {
  const rec = buildClosureRecord({
    closureType: 'explicit_noncommit_reason',
    taskId: 'syntax-task',
    lane: 'L',
    proof: { committed: false, reason: 'syntax_fail_quarantined', advance_justified: true },
    okToAdvance: true,
  });
  assert.equal(rec.ok_to_advance, true);
  assert.equal(rec.proof.reason, 'syntax_fail_quarantined');
});

test('explicit_noncommit_reason: throws if reason missing', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'explicit_noncommit_reason',
        taskId: 'x',
        lane: 'L',
        proof: { committed: false },
        okToAdvance: false,
      }),
    /explicit_noncommit_reason requires/,
  );
});

test('explicit_noncommit_reason: throws if committed is not false', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'explicit_noncommit_reason',
        taskId: 'x',
        lane: 'L',
        proof: { committed: true, reason: 'some reason' },
        okToAdvance: false,
      }),
    /explicit_noncommit_reason requires/,
  );
});

// ── invalid type ──────────────────────────────────────────────────────────────

test('unknown closure_type throws', () => {
  assert.throws(
    () =>
      buildClosureRecord({
        closureType: 'invented_type',
        taskId: 'x',
        lane: 'L',
        proof: {},
        okToAdvance: true,
      }),
    /C09 contract violation/,
  );
});

// ── validateClosureRecord ─────────────────────────────────────────────────────

test('validateClosureRecord: rejects wrong event', () => {
  const v = validateClosureRecord({ event: 'task_ok', task_id: 'x', lane: 'L', closure_type: 'committed_success', proof: {}, ok_to_advance: true });
  assert.equal(v.valid, false);
});

test('validateClosureRecord: rejects missing task_id', () => {
  const v = validateClosureRecord({ event: 'closure_contract_result', lane: 'L', closure_type: 'committed_success', proof: {}, ok_to_advance: true });
  assert.equal(v.valid, false);
});

// ── Synthetic proof event ─────────────────────────────────────────────────────
// This is the "one synthetic closure_contract_result event exists" proof required by C09.

test('synthetic proof: closure_contract_result is valid JSON round-trip', () => {
  const rec = buildClosureRecord({
    closureType: 'committed_success',
    taskId: 'synthetic-proof-task',
    lane: 'TEST_LANE',
    proof: { ok: true, committed: true, commit_sha: 'deadbeef', model_used: 'gemini_flash', synthetic: true },
    okToAdvance: true,
  });
  // Simulate logLine() serialization
  const line = JSON.stringify({ ts: new Date().toISOString(), ...rec });
  const parsed = JSON.parse(line);
  assert.equal(parsed.event, 'closure_contract_result');
  assert.equal(parsed.closure_type, 'committed_success');
  assert.equal(parsed.ok_to_advance, true);
  assert.equal(parsed.proof.synthetic, true);
  const v = validateClosureRecord(parsed);
  assert.equal(v.valid, true, `validateClosureRecord failed: ${v.reason}`);
  // Log to stdout so the proof is visible in test output
  console.log('\n[C09 SYNTHETIC PROOF]', line);
});
