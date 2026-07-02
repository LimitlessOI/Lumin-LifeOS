/**
 * SYNOPSIS: Tier-1 intent validator — unit tests for coverage rule + shape normalization.
 * Tier-1 intent validator — unit tests.
 *
 * Verifies validateIntentTier1() and tier1CoveragePass() agree with the ARC
 * entry-gate contract across v1/v2 coverage-map shapes and gap/missing cases.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateIntentTier1,
  tier1CoveragePass,
  normalize,
} from '../scripts/validate-intent-tier1.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const MISSIONS = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');

function writeTmpMap(map) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tier1-'));
  fs.writeFileSync(path.join(dir, 'INTENT_COVERAGE_MAP.json'), JSON.stringify(map));
  return dir;
}

test('PASS: real v2 mission (FOUNDER-ALPHA-GAPFILL) passes', () => {
  const r = validateIntentTier1('FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.intent_id, 'FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001');
  assert.ok(r.load_bearing_count > 0);
});

test('PASS: legacy v1 shape (dimension/status/mission_id) is normalized and passes', () => {
  const r = validateIntentTier1('FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001');
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('FAIL: load-bearing dimension MISSING is blocked', () => {
  const dir = writeTmpMap({
    schema: 'intent_coverage_map_v2',
    intent_id: 'TEST-FAIL',
    dimensions: [
      { name: 'outcome', coverage_level: 'MISSING', load_bearing: true },
      { name: 'user', coverage_level: 'SUFFICIENT', load_bearing: true },
    ],
  });
  const r = validateIntentTier1(dir);
  assert.equal(r.ok, false);
  assert.deepEqual(r.blocking, ['outcome:MISSING']);
});

test('FAIL: missing coverage map file', () => {
  const r = validateIntentTier1(path.join(os.tmpdir(), 'no-such-mission-xyz'));
  assert.equal(r.ok, false);
  assert.match(r.error, /not found/);
});

test('PASS: load-bearing PARKED and PARTIAL are acceptable (matches entry-gate)', () => {
  const map = normalize({
    schema: 'intent_coverage_map_v2',
    intent_id: 'TEST-OK',
    dimensions: [
      { name: 'a', coverage_level: 'PARKED', load_bearing: true },
      { name: 'b', coverage_level: 'PARTIAL', load_bearing: true },
      { name: 'c', coverage_level: 'MISSING', load_bearing: false },
    ],
  });
  assert.equal(tier1CoveragePass(map).pass, true);
});

test('consistency: validator agrees with tier1CoveragePass on every real mission', () => {
  const missionDirs = fs
    .readdirSync(MISSIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(MISSIONS, d.name))
    .filter((d) => fs.existsSync(path.join(d, 'INTENT_COVERAGE_MAP.json')));
  assert.ok(missionDirs.length > 0, 'expected at least one mission with a coverage map');
  for (const dir of missionDirs) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'INTENT_COVERAGE_MAP.json'), 'utf8'));
    const cov = tier1CoveragePass(normalize(raw));
    const r = validateIntentTier1(dir);
    // Structural validity aside, a coverage-rule pass must never be reported as a coverage FAIL.
    if (cov.pass && r.ok === false) {
      assert.notEqual(r.error, 'tier-1 load-bearing coverage incomplete', `disagreement for ${path.basename(dir)}: ${JSON.stringify(r)}`);
    }
  }
});
