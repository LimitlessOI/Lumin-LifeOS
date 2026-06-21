/**
 * SYNOPSIS: js — tests/oil-proof-freshness.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateProofFreshness,
  mergeRuntimeProofWithFreshness,
  SELF_REPAIR_AUDIT_MAX_AGE_MS,
} from '../services/oil-proof-freshness.js';

const DEPLOY = 'b251c51b1bd162c0b3ee932881078e270909bae8';
const OLD = '380d84ddb29e4ba93a6658f2557b653c1d023e73';
const NOW = new Date('2026-05-24T10:00:00.000Z');

test('evaluateProofFreshness marks gemini STALE when receipt SHA != deploy SHA', () => {
  const r = evaluateProofFreshness({
    railwayDeploySha: DEPLOY,
    geminiReceipt: {
      created_at: '2026-05-24T04:01:55.168Z',
      commit_sha: OLD,
    },
    phase14Cert: { certified_at: '2026-05-24T04:01:56.796Z' },
    latestSelfRepairReceiptAt: '2026-05-24T03:59:09.428Z',
    now: NOW,
  });
  assert.equal(r.proofs.gemini_runtime.status, 'STALE');
  assert.equal(r.proofs.phase14.status, 'STALE');
  assert.equal(r.overall, 'STALE');
  assert.equal(r.verified, false);
});

test('evaluateProofFreshness marks gemini CURRENT when SHAs match', () => {
  const r = evaluateProofFreshness({
    railwayDeploySha: DEPLOY,
    geminiReceipt: { created_at: NOW.toISOString(), commit_sha: DEPLOY },
    phase14Cert: { certified_at: NOW.toISOString() },
    latestSelfRepairReceiptAt: NOW.toISOString(),
    now: NOW,
  });
  assert.equal(r.proofs.gemini_runtime.status, 'CURRENT');
  assert.equal(r.overall, 'CURRENT');
});

test('evaluateProofFreshness marks self-repair STALE after 24h', () => {
  const old = new Date(NOW.getTime() - SELF_REPAIR_AUDIT_MAX_AGE_MS - 1000).toISOString();
  const r = evaluateProofFreshness({
    railwayDeploySha: DEPLOY,
    geminiReceipt: { created_at: NOW.toISOString(), commit_sha: DEPLOY },
    phase14Cert: { certified_at: NOW.toISOString() },
    latestSelfRepairReceiptAt: old,
    now: NOW,
  });
  assert.equal(r.proofs.self_repair_audit.status, 'STALE');
  assert.equal(r.overall, 'STALE');
});

test('mergeRuntimeProofWithFreshness never returns VERIFIED when stale', () => {
  const runtime = {
    status: 'VERIFIED',
    verified: true,
    mismatches: [],
    p0_blockers: [],
  };
  const freshness = { stale: true, overall: 'STALE' };
  const merged = mergeRuntimeProofWithFreshness(runtime, freshness);
  assert.equal(merged.status, 'STALE');
  assert.equal(merged.verified, false);
  assert.equal(merged.blocks_build, false);
});

test('mergeRuntimeProofWithFreshness blocks build only on P0', () => {
  const runtime = {
    status: 'NOT_VERIFIED',
    verified: false,
    mismatches: [{ severity: 'P0' }],
    p0_blockers: [{ severity: 'P0' }],
  };
  const freshness = { stale: false, overall: 'CURRENT' };
  const merged = mergeRuntimeProofWithFreshness(runtime, freshness);
  assert.equal(merged.blocks_build, true);
});