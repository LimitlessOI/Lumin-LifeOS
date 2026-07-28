/**
 * SYNOPSIS: Falsifiability tests for the security-invariant gate.
 *
 * SELF_REPAIR_DOCTRINE Part 1 rule 2: every hard gate ships with a test proving
 * it fires on real breakage AND passes on real success. Both directions are
 * asserted here against the real protected file, not a toy fixture, because an
 * unpassable gate is its own failure mode.
 *
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INVARIANTS,
  POSTURE,
  countOccurrences,
  evaluateInvariants,
  formatFindings,
} from '../scripts/lib/security-invariants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTECTED = 'routes/tc-routes.js';
const rule = INVARIANTS.find((r) => r.file === PROTECTED);
const realContent = readFileSync(path.join(ROOT, PROTECTED), 'utf8');

test('countOccurrences counts non-overlapping hits', () => {
  assert.equal(countOccurrences('aXbXc', 'X'), 2);
  assert.equal(countOccurrences('aaaa', 'aa'), 2);
  assert.equal(countOccurrences('none', 'X'), 0);
  assert.equal(countOccurrences('anything', ''), 0);
  assert.equal(countOccurrences(null, 'X'), 0);
});

test('the invariant list still protects tc-routes requireLifeOSAdmin', () => {
  assert.ok(rule, 'tc-routes.js invariant must exist');
  assert.equal(rule.substring, 'requireLifeOSAdmin');
  assert.equal(rule.posture, POSTURE.BLOCK, 'auth is in the blockable set');
});

test('PASSES ON REAL SUCCESS — the live file satisfies its own invariant', () => {
  const observed = countOccurrences(realContent, rule.substring);
  assert.ok(
    observed >= rule.minCount,
    `live ${PROTECTED} has ${observed} occurrences, invariant needs ${rule.minCount} — `
      + 'if routes were removed on purpose, lower minCount deliberately',
  );
  const result = evaluateInvariants([{ path: PROTECTED, content: realContent }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.checked, [PROTECTED]);
});

test('FIRES ON REAL BREAKAGE — auth helper stripped from the live file', () => {
  const stripped = realContent.replaceAll(rule.substring, 'noAuthAtAll');
  const result = evaluateInvariants([{ path: PROTECTED, content: stripped }]);
  assert.equal(result.ok, false);
  assert.equal(result.blocking.length, 1);
  assert.equal(result.blocking[0].observed, 0);
  assert.equal(result.blocking[0].file, PROTECTED);
});

test('fires on a partial strip, not only a total one', () => {
  const once = realContent.replace(new RegExp(rule.substring, 'g'), (m, off) => (off > 200 ? 'gone' : m));
  const observed = countOccurrences(once, rule.substring);
  if (observed < rule.minCount) {
    const result = evaluateInvariants([{ path: PROTECTED, content: once }]);
    assert.equal(result.ok, false, 'a partial strip below minCount must still block');
  }
});

test('every finding carries a concrete proposed_solution (SO-002 solution-mandatory)', () => {
  const result = evaluateInvariants([{ path: PROTECTED, content: '' }]);
  assert.equal(result.ok, false);
  for (const f of result.findings) {
    assert.ok(f.proposed_solution && f.proposed_solution.length > 40, 'finding needs a real fix');
    assert.match(f.proposed_solution, /minCount|Restore/);
    assert.ok(f.reason && f.reason.length > 40, 'finding needs the reason the gate exists');
  }
  assert.ok(formatFindings(result.findings).includes(PROTECTED));
});

test('does not fail ships that never touch a protected file', () => {
  const result = evaluateInvariants([
    { path: 'services/unrelated.js', content: 'export const x = 1;' },
    { path: 'docs/notes.md', content: '# notes' },
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.checked, []);
  assert.deepEqual(result.findings, []);
});

test('an absent protected file is not treated as empty', () => {
  const result = evaluateInvariants([]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('accepts the execute-batch payload shape (target_file/output)', () => {
  const result = evaluateInvariants([{ target_file: PROTECTED, output: realContent }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.checked, [PROTECTED]);

  const broken = evaluateInvariants([{ target_file: PROTECTED, output: 'nothing' }]);
  assert.equal(broken.ok, false);
});

test('accepts Map and plain-object forms', () => {
  const asMap = evaluateInvariants(new Map([[PROTECTED, realContent]]));
  assert.equal(asMap.ok, true);
  const asObj = evaluateInvariants({ [PROTECTED]: 'stripped' });
  assert.equal(asObj.ok, false);
});

test('ROUTE-posture findings detect without blocking (Gate Charter default)', () => {
  const routeOnly = [{
    file: 'services/example.js',
    substring: 'someSoftInvariant',
    minCount: 3,
    klass: 'auth',
    posture: POSTURE.ROUTE,
    reason: 'a soft invariant that should inform routing rather than halt the loop entirely',
  }];
  const result = evaluateInvariants(
    [{ path: 'services/example.js', content: 'someSoftInvariant' }],
    { invariants: routeOnly },
  );
  assert.equal(result.ok, true, 'route posture must not idle the loop');
  assert.equal(result.routed.length, 1);
  assert.deepEqual(result.blocking, []);
});

test('non-string content is skipped rather than crashing the gate', () => {
  const result = evaluateInvariants([{ path: PROTECTED, content: Buffer.from('x') }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.checked, []);
});
