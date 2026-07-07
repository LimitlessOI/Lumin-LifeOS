/**
 * SYNOPSIS: js — tests/deploy-truth.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSha,
  shasMatch,
  extractDeployedSha,
  proveDeployServesSha,
  waitForDeploySha,
  interpretCompareStatus,
} from '../services/deploy-truth.js';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

test('normalizeSha accepts valid hex, rejects junk', () => {
  assert.equal(normalizeSha('ABC1234'), 'abc1234');
  assert.equal(normalizeSha('  d0052b05b  '), 'd0052b05b');
  assert.equal(normalizeSha('not-a-sha'), null);
  assert.equal(normalizeSha(''), null);
  assert.equal(normalizeSha(null), null);
});

test('shasMatch handles short vs full prefix', () => {
  assert.equal(shasMatch('d0052b0', 'd0052b05bdeadbeef'), true);
  assert.equal(shasMatch('d0052b05bdeadbeef', 'd0052b0'), true);
  assert.equal(shasMatch('d0052b0', 'e0052b0'), false);
  assert.equal(shasMatch('d0052b0', null), false);
});

test('extractDeployedSha reads codegen / builder / top-level shapes', () => {
  assert.equal(extractDeployedSha({ codegen: { deploy_commit_sha: 'abc1234' } }), 'abc1234');
  assert.equal(extractDeployedSha({ builder: { deploy_commit_sha: 'def5678' } }), 'def5678');
  assert.equal(extractDeployedSha({ deploy_commit_sha: 'aaa1111' }), 'aaa1111');
  assert.equal(extractDeployedSha({ nothing: true }), null);
});

test('proveDeployServesSha OK when served sha matches expected', async () => {
  const fetchFn = async () => jsonResponse({ codegen: { deploy_commit_sha: 'd0052b05bfeed' } });
  const r = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn });
  assert.equal(r.ok, true);
  assert.equal(r.matches, true);
  assert.equal(r.served_sha, 'd0052b05bfeed');
});

test('proveDeployServesSha FAILS when deploy serves a different sha (no false live)', async () => {
  const fetchFn = async () => jsonResponse({ codegen: { deploy_commit_sha: 'e0052b05b' } });
  const r = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'deploy_serves_different_sha');
});

test('proveDeployServesSha FAILS when ready exposes no sha, or errors, or non-200', async () => {
  const noSha = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn: async () => jsonResponse({ ok: true }) });
  assert.equal(noSha.ok, false);
  assert.equal(noSha.reason, 'ready_exposes_no_sha');

  const http500 = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn: async () => jsonResponse({}, false, 500) });
  assert.equal(http500.ok, false);
  assert.match(http500.reason, /ready_http_500/);

  const threw = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn: async () => { throw new Error('boom'); } });
  assert.equal(threw.ok, false);
  assert.match(threw.reason, /ready_fetch_error:boom/);
});

test('proveDeployServesSha rejects invalid inputs', async () => {
  assert.equal((await proveDeployServesSha({ expectedSha: 'nope', baseUrl: 'https://x', fetchFn: async () => jsonResponse({}) })).reason, 'invalid_expected_sha');
  assert.equal((await proveDeployServesSha({ expectedSha: 'd0052b0', fetchFn: async () => jsonResponse({}) })).reason, 'missing_base_url');
});

test('waitForDeploySha polls until the deploy advances', async () => {
  let call = 0;
  const fetchFn = async () => {
    call += 1;
    const sha = call >= 3 ? 'd0052b05b' : 'aaaaaaa';
    return jsonResponse({ codegen: { deploy_commit_sha: sha } });
  };
  const r = await waitForDeploySha({ expectedSha: 'd0052b05b', baseUrl: 'https://x', fetchFn, attempts: 5, sleepFn: async () => {} });
  assert.equal(r.ok, true);
  assert.equal(r.attempts_used, 3);
});

test('waitForDeploySha gives up after attempts, never false-positives', async () => {
  const fetchFn = async () => jsonResponse({ codegen: { deploy_commit_sha: 'aaaaaaa' } });
  const r = await waitForDeploySha({ expectedSha: 'd0052b05b', baseUrl: 'https://x', fetchFn, attempts: 3, sleepFn: async () => {} });
  assert.equal(r.ok, false);
  assert.equal(r.attempts_used, 3);
});

test('interpretCompareStatus: served contains built iff identical/ahead', () => {
  assert.equal(interpretCompareStatus('identical'), true);
  assert.equal(interpretCompareStatus('ahead'), true); // head(served) is ahead of base(built) → served includes built
  assert.equal(interpretCompareStatus('behind'), false); // head(served) is behind base(built) → missing built → not live
  assert.equal(interpretCompareStatus('diverged'), false);
  assert.equal(interpretCompareStatus(null), false);
});

test('proveDeployServesSha OK when served sha is a DESCENDANT that contains the built commit', async () => {
  // Busy repo: a later queue-status commit advanced HEAD, so served != built exactly,
  // but the built code IS live. compareFn(base=built, head=served) === "ahead"
  // (head is ahead of base) proves containment.
  const fetchFn = async () => jsonResponse({ codegen: { deploy_commit_sha: 'ffffff0abc123' } });
  const compareFn = async (base, head) => {
    assert.equal(base, 'd0052b0');
    assert.equal(head, 'ffffff0abc123');
    return 'ahead';
  };
  const r = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn, compareFn });
  assert.equal(r.ok, true);
  assert.equal(r.matches, false);
  assert.equal(r.contains, true);
  assert.equal(r.reason, 'deploy_contains_built_sha');
});

test('proveDeployServesSha FAILS (no false live) when served is BEHIND the built commit', async () => {
  const fetchFn = async () => jsonResponse({ codegen: { deploy_commit_sha: 'aaaaaa0def456' } });
  const compareFn = async () => 'behind'; // head(served) is behind base(built) → served does NOT contain built
  const r = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn, compareFn });
  assert.equal(r.ok, false);
  assert.equal(r.contains, false);
  assert.equal(r.reason, 'deploy_serves_different_sha');
});

test('proveDeployServesSha stays fail-closed when compareFn errors or is absent', async () => {
  const fetchFn = async () => jsonResponse({ codegen: { deploy_commit_sha: 'bbbbbb0fed789' } });
  const threw = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn, compareFn: async () => { throw new Error('gh down'); } });
  assert.equal(threw.ok, false);
  assert.equal(threw.reason, 'deploy_serves_different_sha');

  const noCompare = await proveDeployServesSha({ expectedSha: 'd0052b0', baseUrl: 'https://x', fetchFn });
  assert.equal(noCompare.ok, false);
  assert.equal(noCompare.reason, 'deploy_serves_different_sha');
});
