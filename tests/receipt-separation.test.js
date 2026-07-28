/**
 * SYNOPSIS: Tests for receipt separation-of-duties enforcement and validator coverage.
 *
 * Proves both directions required by SELF_REPAIR_DOCTRINE Part 1 rule 2: the rule
 * fires on a self-verified PASS, and passes on a genuinely independent one. Also
 * proves the doctrine's own escape hatch (declared collapse) is honoured, and
 * that validator coverage can no longer be dodged by naming a file differently.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SEPARATION_CUTOFF_ISO,
  evaluateSeparation,
  isGrandfathered,
  readActors,
  sameActor,
  separationSolution,
} from '../scripts/lib/receipt-separation.mjs';
import { validateReceiptObject, validateReceiptDirectory } from '../services/receipt-truth-validator.js';

const NEW = '2026-07-28T12:00:00.000Z';
const OLD = '2026-01-01T00:00:00.000Z';

function passReceipt(extra = {}) {
  return { schema: 'thing_verify_v1', verdict: 'PASS', at: NEW, ...extra };
}

test('readActors accepts the common key spellings', () => {
  assert.equal(readActors({ produced_by: ' a ' }).producer, 'a');
  assert.equal(readActors({ author: 'b' }).producer, 'b');
  assert.equal(readActors({ built_by: 'c' }).producer, 'c');
  assert.equal(readActors({ verified_by: 'v' }).verifier, 'v');
  assert.equal(readActors({ checked_by: 'w' }).verifier, 'w');
  assert.equal(readActors({ audited_by: 'x' }).verifier, 'x');
  assert.equal(readActors({}).producer, null);
});

test('sameActor ignores case and surrounding space', () => {
  assert.equal(sameActor('Cursor', ' cursor '), true);
  assert.equal(sameActor('a', 'b'), false);
  assert.equal(sameActor(null, null), false);
});

test('grandfathering covers legacy receipts but not new or v2+ schemas', () => {
  assert.equal(isGrandfathered({ at: OLD }), true);
  assert.equal(isGrandfathered({}), true, 'no timestamp means legacy');
  assert.equal(isGrandfathered({ at: 'not-a-date' }), true);
  assert.equal(isGrandfathered({ at: NEW }), false);
  assert.equal(isGrandfathered({ at: OLD, schema: 'x_v2' }), false, 'v2+ opts in regardless of date');
  assert.ok(Date.parse(SEPARATION_CUTOFF_ISO) > 0);
});

test('a non-passing receipt is never flagged for separation', () => {
  const r = evaluateSeparation({ verdict: 'UNSOLVED', at: NEW }, false);
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.advisories, []);
});

test('FIRES — a new PASS with no named verifier is a violation', () => {
  const r = evaluateSeparation(passReceipt({ produced_by: 'builder' }), true);
  assert.deepEqual(r.violations, ['PASS_WITHOUT_NAMED_VERIFIER']);
});

test('FIRES — producer and verifier being the same actor is self-verification', () => {
  const r = evaluateSeparation(passReceipt({ produced_by: 'Builder', verified_by: 'builder' }), true);
  assert.deepEqual(r.violations, ['PASS_SELF_VERIFIED']);
});

test('FIRES — a verifier with no named producer cannot be proven independent', () => {
  const r = evaluateSeparation(passReceipt({ verified_by: 'sentry' }), true);
  assert.deepEqual(r.violations, ['PASS_WITHOUT_NAMED_PRODUCER']);
});

test('PASSES — genuinely independent producer and verifier', () => {
  const r = evaluateSeparation(passReceipt({ produced_by: 'builder', verified_by: 'sentry' }), true);
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.advisories, []);
});

test('honours the doctrine escape hatch: declared collapse with a reason', () => {
  const ok = evaluateSeparation(
    passReceipt({
      produced_by: 'builder',
      separation_collapsed: true,
      separation_note: 'no independent verifier existed for this offline repair path',
    }),
    true,
  );
  assert.deepEqual(ok.violations, [], 'declared collapse with a real reason is permitted');

  const bare = evaluateSeparation(passReceipt({ produced_by: 'builder', separation_collapsed: true }), true);
  assert.deepEqual(bare.violations, ['SEPARATION_COLLAPSE_WITHOUT_REASON']);

  const thin = evaluateSeparation(
    passReceipt({ produced_by: 'b', separation_collapsed: true, separation_note: 'because' }),
    true,
  );
  assert.deepEqual(thin.violations, ['SEPARATION_COLLAPSE_WITHOUT_REASON'], 'a token reason is not a reason');
});

test('legacy receipts are advised, not failed', () => {
  const r = evaluateSeparation({ schema: 'old_v1', verdict: 'PASS', at: OLD }, true);
  assert.deepEqual(r.violations, []);
  assert.equal(r.advisories.length, 1);
  assert.match(r.advisories[0], /^GRANDFATHERED:/);
});

test('every separation violation code has a concrete solution', () => {
  for (const code of [
    'PASS_WITHOUT_NAMED_VERIFIER',
    'PASS_SELF_VERIFIED',
    'PASS_WITHOUT_NAMED_PRODUCER',
    'SEPARATION_COLLAPSE_WITHOUT_REASON',
  ]) {
    assert.ok(separationSolution(code).length > 40, `${code} needs a real fix`);
  }
});

test('validateReceiptObject surfaces separation violations with solutions', () => {
  const r = validateReceiptObject(passReceipt({ produced_by: 'x', verified_by: 'x' }), 'THING_VERIFY.json');
  assert.equal(r.ok, false);
  assert.ok(r.violations.includes('PASS_SELF_VERIFIED'));
  assert.ok(r.proposed_solutions.every((s) => s.proposed_solution.length > 20));
});

test('validator coverage can no longer be dodged by filename', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipts-'));
  // A name matching none of the old hint patterns — previously skipped entirely.
  fs.writeFileSync(
    path.join(dir, 'SOMETHING_UNHINTED.json'),
    JSON.stringify(passReceipt({ produced_by: 'b', verified_by: 'b' })),
  );
  const report = validateReceiptDirectory(dir);
  assert.equal(report.checked, 1, 'an unhinted filename must still be checked');
  assert.equal(report.ok, false);
  assert.match(report.failures[0], /SOMETHING_UNHINTED\.json/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the validator does not grade its own report', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipts-'));
  fs.writeFileSync(
    path.join(dir, 'RECEIPT_TRUTH_VALIDATION.json'),
    JSON.stringify(passReceipt({ produced_by: 'v', verified_by: 'v' })),
  );
  const report = validateReceiptDirectory(dir);
  assert.equal(report.checked, 0, 'the validator must skip its own output file');
  assert.equal(report.ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});
