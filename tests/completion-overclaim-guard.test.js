/**
 * SYNOPSIS: js — tests/completion-overclaim-guard.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeVocabulary,
  normalizeLevel,
  cumulativeGates,
  evaluateClaim,
  validateVocabularyConsistency,
  scanClaimSources,
} from '../services/completion-overclaim-guard.js';

const FIXTURE = {
  schema: 'completion_vocabulary_ssot_v1',
  version: '1.0-test',
  status: 'LOCKED',
  gates: {
    blueprint_exists: 'a BLUEPRINT.json exists',
    acceptance_exit_0: 'named acceptance npm script exit 0',
    deploy_truth_pass: 'built SHA is actually served',
    founder_confirm: 'founder confirmed usable, >=12-char quote',
    live_smoke: 'live golden-path smoke green',
    rollback_proven: 'one-click rollback proven',
  },
  ladder: [
    { level: 'BLUEPRINT_ACTIVE', rank: 1, gates: ['blueprint_exists'] },
    { level: 'TECHNICAL_PASS', rank: 2, gates: ['acceptance_exit_0', 'deploy_truth_pass'] },
    { level: 'FOUNDER_USABILITY_PASS', rank: 3, gates: ['founder_confirm'] },
    { level: 'POINT_B_COMPLETE', rank: 4, gates: [] },
    { level: 'RELEASE_READY', rank: 5, gates: ['live_smoke', 'rollback_proven'] },
  ],
  aliases: { PASS: 'TECHNICAL_PASS', OBJECTIVE_COMPLETE: 'TECHNICAL_PASS' },
  honesty_states: ['BUILT_NOT_LIVE', 'UNVERIFIED', 'BLOCKED_EXTERNAL'],
};

const vocab = normalizeVocabulary(FIXTURE);

test('normalizeLevel resolves aliases to canonical levels', () => {
  assert.equal(normalizeLevel('pass', vocab), 'TECHNICAL_PASS');
  assert.equal(normalizeLevel('OBJECTIVE_COMPLETE', vocab), 'TECHNICAL_PASS');
  assert.equal(normalizeLevel('TECHNICAL_PASS', vocab), 'TECHNICAL_PASS');
});

test('cumulativeGates includes every lower-rank gate', () => {
  assert.deepEqual(
    [...cumulativeGates('POINT_B_COMPLETE', vocab)].sort(),
    ['acceptance_exit_0', 'blueprint_exists', 'deploy_truth_pass', 'founder_confirm'].sort(),
  );
});

test('claim with all gates proven passes', () => {
  const r = evaluateClaim({
    claimedLevel: 'TECHNICAL_PASS',
    provenGates: ['blueprint_exists', 'acceptance_exit_0', 'deploy_truth_pass'],
  }, vocab);
  assert.equal(r.ok, true);
  assert.equal(r.downgradedTo, null);
});

test('overclaim auto-downgrades to highest provable level', () => {
  // claims RELEASE_READY but only proved through TECHNICAL_PASS gates
  const r = evaluateClaim({
    claimedLevel: 'RELEASE_READY',
    provenGates: ['blueprint_exists', 'acceptance_exit_0', 'deploy_truth_pass'],
  }, vocab);
  assert.equal(r.ok, false);
  assert.equal(r.highestProvable, 'TECHNICAL_PASS');
  assert.equal(r.downgradedTo, 'TECHNICAL_PASS');
  assert.ok(r.missing.includes('founder_confirm'));
});

test('claim with no proof downgrades to UNVERIFIED', () => {
  const r = evaluateClaim({ claimedLevel: 'TECHNICAL_PASS', provenGates: [] }, vocab);
  assert.equal(r.ok, false);
  assert.equal(r.downgradedTo, 'UNVERIFIED');
});

test('honesty states never overclaim', () => {
  const r = evaluateClaim({ claimedLevel: 'BUILT_NOT_LIVE', provenGates: [] }, vocab);
  assert.equal(r.ok, true);
  assert.equal(r.isHonestyState, true);
});

test('unknown word cannot be trusted', () => {
  const r = evaluateClaim({ claimedLevel: 'TOTALLY_DONE', provenGates: [] }, vocab);
  assert.equal(r.ok, false);
  assert.equal(r.downgradedTo, 'UNVERIFIED');
});

test('validateVocabularyConsistency flags undefined gate + duplicate rank', () => {
  const bad = normalizeVocabulary({
    ...FIXTURE,
    ladder: [
      { level: 'A', rank: 1, gates: ['ghost_gate'] },
      { level: 'B', rank: 1, gates: [] },
    ],
  });
  const res = validateVocabularyConsistency(bad);
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => p.includes('ghost_gate')));
  assert.ok(res.problems.some((p) => p.includes('duplicate rank')));
});

test('scanClaimSources catches an overclaim in a boolean-map file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'overclaim-'));
  fs.mkdirSync(path.join(dir, 'status'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'status', 'CERT.json'),
    JSON.stringify({ levels: { TECHNICAL_PASS: true, RELEASE_READY: true } }),
  );
  fs.writeFileSync(
    path.join(dir, 'status', 'DEPLOY_TRUTH.json'),
    JSON.stringify({ verdict: 'PASS' }),
  );
  const v = normalizeVocabulary({
    ...FIXTURE,
    claim_sources: [{
      file: 'status/CERT.json',
      claim: { path: 'levels' },
      proven_gates: [
        { gate: 'blueprint_exists', file: 'status/DEPLOY_TRUTH.json', path: 'verdict', equals: 'PASS' },
        { gate: 'acceptance_exit_0', file: 'status/DEPLOY_TRUTH.json', path: 'verdict', equals: 'PASS' },
        { gate: 'deploy_truth_pass', file: 'status/DEPLOY_TRUTH.json', path: 'verdict', equals: 'PASS' },
      ],
    }],
  });
  const violations = scanClaimSources(dir, v);
  // TECHNICAL_PASS is proven; RELEASE_READY is an overclaim → one violation
  assert.equal(violations.length, 1);
  assert.equal(violations[0].claimed, 'RELEASE_READY');
  assert.equal(violations[0].downgraded_to, 'TECHNICAL_PASS');
  fs.rmSync(dir, { recursive: true, force: true });
});
