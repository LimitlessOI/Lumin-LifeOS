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
  loadKnownBadSignaturesRegistry,
  saveKnownBadSignaturesRegistry,
  findRepoWideKnownBadSignature,
  isRepoWideKnownBadSignature,
  recordRepoWideKnownBadSignature,
  markFailedStep,
  SHIP_QUEUE_TIMEOUT_MS,
} from '../services/governed-autonomous-shipping-loop.js';

test('SHIP_QUEUE_TIMEOUT_MS: raised past the old 120s cap that was killing large-file codegen mid-generation', () => {
  // Regression for sb-deliverability-gate (site-builder): confirmed live that
  // failed attempts died at a gap_ms of ~120991, essentially the exact old
  // AbortSignal.timeout(120_000) cap, right after the codegen existing-file
  // cutoff fix started sending large files' full content into the prompt.
  assert.ok(SHIP_QUEUE_TIMEOUT_MS > 120_000, `expected > 120000, got ${SHIP_QUEUE_TIMEOUT_MS}`);
});

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

// Repo-wide registry (2026-07-19): closes the blind spot where a known-bad
// stamp lived only on one step/branch's copy of a queue, so a DIFFERENT
// branch/product reproducing the identical signature had no way to know it
// was already fixed once — which is exactly how the orphaned-import defect
// shipped to `main` twice.
test('findRepoWideKnownBadSignature / isRepoWideKnownBadSignature: no match on an empty registry', () => {
  const registry = { signatures: [] };
  const sig = failureSignature('module_resolution_failed: whatever');
  assert.equal(findRepoWideKnownBadSignature(sig, registry), null);
  assert.equal(isRepoWideKnownBadSignature(sig, registry), false);
});

test('findRepoWideKnownBadSignature / isRepoWideKnownBadSignature: matches regardless of which product/step originally recorded it', () => {
  const sig = failureSignature('module_resolution_failed: cannot find module ../services/x.js');
  const registry = {
    signatures: [{ signature: sig, note: 'fixed on a feature branch, never merged', source_product_id: 'token-accounting-os', source_step_id: 'step1' }],
  };
  // A totally different product/step reproduces the identical signature.
  const found = findRepoWideKnownBadSignature(sig, registry);
  assert.equal(found.source_product_id, 'token-accounting-os');
  assert.equal(isRepoWideKnownBadSignature(sig, registry), true);
});

test('recordRepoWideKnownBadSignature: pure — returns a new registry, appends once, dedupes on re-record', () => {
  const sig = failureSignature('module_resolution_failed: dup case');
  const empty = { signatures: [] };
  const once = recordRepoWideKnownBadSignature(sig, { note: 'first' }, empty);
  assert.deepEqual(empty.signatures, [], 'input registry must not be mutated');
  assert.equal(once.signatures.length, 1);

  const twice = recordRepoWideKnownBadSignature(sig, { note: 'second attempt, same signature' }, once);
  assert.equal(twice.signatures.length, 1, 'recording the same signature again must not duplicate');
});

test('loadKnownBadSignaturesRegistry: fails open to an empty registry when the file does not exist', () => {
  const registry = loadKnownBadSignaturesRegistry.call(null); // reads the real (or absent) repo file
  assert.ok(Array.isArray(registry.signatures));
});

test('saveKnownBadSignaturesRegistry / loadKnownBadSignaturesRegistry round-trip through the real repo path', () => {
  // These two are the only pair in this suite that touch the real
  // data/known-bad-signatures-registry.json path (it's not injectable) —
  // save the prior content, restore it after, so this test can't leave
  // permanent state behind in the repo.
  const before = loadKnownBadSignaturesRegistry();
  try {
    const sig = failureSignature('round_trip_test_signature_only');
    saveKnownBadSignaturesRegistry({ signatures: [{ signature: sig, note: 'round-trip test' }] });
    const reloaded = loadKnownBadSignaturesRegistry();
    assert.equal(reloaded.signatures.length, 1);
    assert.equal(reloaded.signatures[0].signature, sig);
  } finally {
    saveKnownBadSignaturesRegistry(before);
  }
});

// Regression test for a real bug found 2026-07-19: markFailedStep's repeat-
// regression log line referenced `knownBad`, a variable that only exists
// inside isKnownBadSignature's own closure — a ReferenceError that fired
// exactly when a repeat regression was detected, thrown BEFORE persistQueue()
// could save the escalation state. The mechanism could not complete a save
// the one time it mattered. isKnownBadSignature's own unit tests above never
// caught this because they test the pure function in isolation, not this call
// site inside markFailedStep — deliberately, since markFailedStep's normal
// path calls commitQueueStatus, which hits the live GitHub API via
// GITHUB_TOKEN/GITHUB_REPO (both configured in this environment) and must
// never be triggered by a unit test. This test exercises the REAL
// markFailedStep function end-to-end but engineers `shouldCommit` to false
// (same last_error as before + attempts past the always-commit window + not a
// power-of-two attempt count) so it returns cleanly right after persistQueue()
// without ever reaching the network call — proving the fix without the risk.
test('markFailedStep: repeat-regression branch (step-level) completes without throwing and persists state', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mark-failed-step-'));
  const queuePath = path.join(tmpDir, 'BUILD_QUEUE.json');
  const errorText = 'module_resolution_failed: cannot find module ../services/known-bad-regression-test.js';
  const signature = failureSignature(errorText);

  const queue = {
    product_id: 'test-product-regression',
    _sourcePath: queuePath,
    steps: [
      {
        id: 'step-1',
        status: 'in_progress',
        attempts: 4, // -> 5 after increment: > 2 and not a power of two
        last_error: errorText, // matches deriveFailureReason(body) below -> shouldCommit stays false
        known_bad_signatures: [{ signature, note: 'already fixed once; recorded on this step' }],
      },
    ],
  };

  const warnings = [];
  const logger = { warn: (obj, msg) => warnings.push({ obj, msg }), info() {}, error() {} };

  try {
    await markFailedStep(queue, 'step-1', { error: errorText }, 'test-product-regression', logger);

    const step = queue.steps[0];
    assert.equal(step.force_model_rotation, true);
    assert.equal(step.model_rotation, 1);

    const repeatWarning = warnings.find((w) => /REPEAT REGRESSION/.test(w.msg));
    assert.ok(repeatWarning, 'expected the REPEAT REGRESSION warning to be logged without throwing');
    assert.equal(repeatWarning.obj.known_bad_source, 'step');
    assert.equal(repeatWarning.obj.known_bad_note, 'already fixed once; recorded on this step');

    // persistQueue must have actually run (this was the exact thing the bug
    // prevented — the throw happened before persistQueue() was reached).
    assert.ok(fs.existsSync(queuePath), 'persistQueue must have written the queue file');
    const onDisk = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(onDisk.steps[0].force_model_rotation, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('markFailedStep: repeat-regression branch (repo-wide only, no step-level record) also completes cleanly', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mark-failed-step-repowide-'));
  const queuePath = path.join(tmpDir, 'BUILD_QUEUE.json');
  const errorText = 'module_resolution_failed: cannot find module ../services/repo-wide-regression-test.js';
  const signature = failureSignature(errorText);

  const queue = {
    product_id: 'test-product-repowide',
    _sourcePath: queuePath,
    steps: [
      {
        id: 'step-1',
        status: 'in_progress',
        attempts: 4,
        last_error: errorText,
        // Deliberately NO known_bad_signatures on the step itself — the
        // signature is only known via the repo-wide registry, simulating a
        // fix that was recorded on a DIFFERENT product/branch's step.
      },
    ],
  };

  const before = loadKnownBadSignaturesRegistry();
  try {
    saveKnownBadSignaturesRegistry(
      recordRepoWideKnownBadSignature(signature, { note: 'fixed on a different branch', source_product_id: 'other-product' }, before),
    );

    const warnings = [];
    const logger = { warn: (obj, msg) => warnings.push({ obj, msg }), info() {}, error() {} };

    // Must await here — a bare `finally` around a non-awaited call restores
    // the registry before markFailedStep's async body ever reads it, making
    // this test pass for the wrong reason (or flake).
    await markFailedStep(queue, 'step-1', { error: errorText }, 'test-product-repowide', logger);

    const step = queue.steps[0];
    assert.equal(step.force_model_rotation, true, 'repo-wide match alone must trigger the same protection as a step-level match');

    const repeatWarning = warnings.find((w) => /REPEAT REGRESSION/.test(w.msg));
    assert.ok(repeatWarning);
    assert.equal(repeatWarning.obj.known_bad_source, 'repo_wide_registry');
  } finally {
    saveKnownBadSignaturesRegistry(before);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
