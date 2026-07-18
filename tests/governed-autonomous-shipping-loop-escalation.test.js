/**
 * SYNOPSIS: js — tests/governed-autonomous-shipping-loop-escalation.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  failureSignature,
  classifyFailure,
  escalationThresholds,
  verifyModuleResolves,
  verifyShippedModulesResolve,
  isKnownBadSignature,
} from '../services/governed-autonomous-shipping-loop.js';

test('failureSignature normalizes hex ids and numbers so repeat failures share one signature', () => {
  const a = failureSignature('module_resolution_failed: target missing routes/foo123.js at commit a1b2c3d4e5f');
  const b = failureSignature('module_resolution_failed: target missing routes/foo789.js at commit ff00ee11aa2');
  assert.equal(a, b);
});

test('failureSignature treats genuinely different errors as different signatures', () => {
  const a = failureSignature('module_resolution_failed: missing export');
  const b = failureSignature('sentry_failed: evidence gap on claim');
  assert.notEqual(a, b);
});

test('classifyFailure buckets known error shapes into the right escalation class', () => {
  assert.equal(classifyFailure('module_resolution_failed: cannot find module'), 'fake_green_attempt');
  assert.equal(classifyFailure('artifact_missing_after_ship: target_file not on disk'), 'fake_green_attempt');
  assert.equal(classifyFailure('not_on_blueprint: step not declared'), 'governance_block');
  assert.equal(classifyFailure('sentry_failed: layer A assertion red'), 'evidence_gap');
  assert.equal(classifyFailure('authority violation: wrote outside blueprint'), 'authority_violation');
  assert.equal(classifyFailure('some other transient timeout'), 'same_signature_repeat');
});

test('escalationThresholds returns the class-specific ladder from LOOP_ESCALATION_CONTRACT.json', () => {
  const fakeGreen = escalationThresholds('fake_green_attempt');
  assert.equal(fakeGreen.notice, 1);
  assert.equal(fakeGreen.escalate, 2);
  assert.equal(fakeGreen.hard_stop, 3);

  const sameSig = escalationThresholds('same_signature_repeat');
  assert.equal(sameSig.notice, 2);
  assert.equal(sameSig.escalate, 3);
  assert.equal(sameSig.hard_stop, 5);
});

test('escalationThresholds falls back to the default ladder for an unknown class', () => {
  const unknown = escalationThresholds('some_class_not_in_the_contract');
  assert.ok(typeof unknown.notice === 'number');
  assert.ok(typeof unknown.escalate === 'number');
  assert.ok(typeof unknown.hard_stop === 'number');
});

test('verifyModuleResolves rejects a module that imports something missing (the real routes/builderOSTokenReceipt.js defect)', () => {
  // Deliberately written OUTSIDE routes/ (in the OS tmpdir) — a sibling test file
  // (tests/spine-import-resolution.test.js) does a readdirSync over the live
  // routes/ directory, and node --test can run files concurrently, so writing a
  // fixture into the real routes/ dir risks a spurious cross-test failure.
  // verifyModuleResolves itself takes an absolute path with no directory
  // restriction, so this still exercises the exact import-resolution check.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipping-loop-verify-'));
  const brokenFile = path.join(tmpDir, 'broken-route.js');
  fs.writeFileSync(
    brokenFile,
    "import { doesNotExist } from './service-that-does-not-exist.js';\nexport default doesNotExist;\n",
  );

  try {
    const result = verifyModuleResolves(brokenFile);
    assert.equal(result.ok, false);
    assert.match(result.reason, /module_resolution_failed/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('verifyModuleResolves accepts a module whose imports genuinely resolve', () => {
  const result = verifyModuleResolves(path.resolve('services/governed-autonomous-shipping-loop.js'));
  assert.equal(result.ok, true);
});

test('verifyShippedModulesResolve rejects a ship step whose target_file does not exist on disk', () => {
  // Same failure category (module_resolution_failed) as "route imports a missing
  // module" — this exercises the routing/guard logic in verifyShippedModulesResolve
  // (which paths it checks vs exempts) without writing into the live routes/ dir.
  const shipSteps = [{ step_id: 'step-missing', target_file: 'routes/__does_not_exist_verify_fixture__.js' }];
  const { proven, unproven } = verifyShippedModulesResolve(shipSteps, ['step-missing']);

  assert.deepEqual(proven, []);
  assert.equal(unproven.length, 1);
  assert.equal(unproven[0].id, 'step-missing');
  assert.match(unproven[0].reason, /module_resolution_failed/);
});

test('verifyShippedModulesResolve proves a ship step whose target_file genuinely resolves', () => {
  const shipSteps = [{ step_id: 'step-real', target_file: 'services/governed-autonomous-shipping-loop.js' }];
  const { proven, unproven } = verifyShippedModulesResolve(shipSteps, ['step-real']);
  assert.deepEqual(unproven, []);
  assert.deepEqual(proven, ['step-real']);
});

test('verifyShippedModulesResolve treats a non-server-surface target (docs/data) as exempt, not a failure', () => {
  const shipSteps = [{ step_id: 'step-docs', target_file: 'docs/products/builderos/PRODUCT_HOME.md' }];
  const { proven, unproven } = verifyShippedModulesResolve(shipSteps, ['step-docs']);
  assert.deepEqual(unproven, []);
  assert.deepEqual(proven, ['step-docs']);
});

// Repeat-regression memory: a plain status reset to `pending` restarts
// same_signature_count at 1, discarding escalation history — observed live
// twice on 2026-07-18 (the same broken-stub defect reshipped after a reset).
// known_bad_signatures is the separate, append-only record that survives a
// reset, stamped via scripts/mark-step-known-bad-signature.mjs.
test('isKnownBadSignature is false for a step with no known_bad_signatures at all', () => {
  const step = { id: 'x', last_error: 'module_resolution_failed: whatever' };
  assert.equal(isKnownBadSignature(step, failureSignature(step.last_error)), false);
});

test('isKnownBadSignature is false when the current signature does not match any recorded one', () => {
  const step = {
    id: 'x',
    known_bad_signatures: [{ signature: failureSignature('sentry_failed: unrelated evidence gap'), note: 'old' }],
  };
  const currentSignature = failureSignature('module_resolution_failed: cannot find module foo');
  assert.equal(isKnownBadSignature(step, currentSignature), false);
});

test('isKnownBadSignature is true when the factory reproduces an already-fixed signature after a reset', () => {
  const originalError = 'module_resolution_failed: cannot find module ../services/builderOSTokenReceipt123.js at commit a1b2c3d4e5f';
  const step = {
    id: 'x',
    status: 'pending', // reset already happened
    known_bad_signatures: [{ signature: failureSignature(originalError), note: 'fixed once already; reset reproduced it' }],
  };
  // The factory reproduces the identical defect on a fresh attempt — a different
  // commit hash and a different numeric suffix on the same filename, which is
  // exactly the volatility failureSignature is designed to normalize away.
  const reproducedError = 'module_resolution_failed: cannot find module ../services/builderOSTokenReceipt987.js at commit ff00ee11aa2';
  assert.equal(isKnownBadSignature(step, failureSignature(reproducedError)), true);
});
