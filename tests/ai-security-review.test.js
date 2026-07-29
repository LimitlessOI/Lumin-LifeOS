/**
 * SYNOPSIS: js — tests/ai-security-review.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reviewDiffForSecurity, buildSecurityReviewPrompt } from '../scripts/ai-security-review.mjs';

function makeFakePool() {
  const inserts = [];
  return {
    inserts,
    query: async (sql, params) => {
      if (/INSERT INTO model_capability_ledger/i.test(sql)) {
        inserts.push({ model_tier: params[0], role: params[1], ok: params[2], theater: params[4] });
      }
      return { rows: [] };
    },
  };
}

test('buildSecurityReviewPrompt: includes the diff text and named vuln classes', () => {
  const prompt = buildSecurityReviewPrompt('+ exec(userInput)', { changedFiles: ['services/foo.js'] });
  assert.ok(prompt.includes('exec(userInput)'));
  assert.ok(prompt.includes('command injection'));
  assert.ok(prompt.includes('services/foo.js'));
});

test('reviewDiffForSecurity: empty diff skips without calling the model', async () => {
  let called = false;
  const result = await reviewDiffForSecurity({ diffText: '', callModel: async () => { called = true; return '{}'; } });
  assert.equal(result.ok, true);
  assert.equal(result.clean, true);
  assert.equal(called, false);
});

test('reviewDiffForSecurity: no callModel provided fails closed, no crash', async () => {
  const result = await reviewDiffForSecurity({ diffText: '+ exec(x)' });
  assert.equal(result.ok, false);
  assert.equal(result.skipped, 'no_model_available');
});

test('reviewDiffForSecurity: a real finding is returned with proposed_solution intact, records ok:true', async () => {
  const pool = makeFakePool();
  const callModel = async () => JSON.stringify({
    findings: [{ severity: 'P0', vuln_class: 'command injection', file: 'x.js', description: 'user input reaches exec()', exploit_scenario: 'attacker controls input', proposed_solution: 'use execFile with an argument array' }],
    clean: false,
  });
  const result = await reviewDiffForSecurity({ diffText: '+ exec(userInput)', callModel, pool });
  assert.equal(result.ok, true);
  assert.equal(result.clean, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].proposed_solution, 'use execFile with an argument array');
  await new Promise((r) => setTimeout(r, 30)); // let the fire-and-forget ledger insert settle
  assert.equal(pool.inserts.length, 1);
  assert.equal(pool.inserts[0].role, 'security_review');
  assert.equal(pool.inserts[0].ok, 1);
});

test('reviewDiffForSecurity: a finding missing proposed_solution is downgraded, not dropped (SO-002)', async () => {
  const callModel = async () => JSON.stringify({
    findings: [{ severity: 'P1', vuln_class: 'XSS', file: 'x.js', description: 'unescaped output' }],
    clean: false,
  });
  const result = await reviewDiffForSecurity({ diffText: '+ res.send(userInput)', callModel });
  assert.equal(result.findings.length, 1);
  assert.ok(result.findings[0].proposed_solution.includes('incomplete finding'));
});

test('reviewDiffForSecurity: a clean diff reports clean:true with no findings', async () => {
  const callModel = async () => JSON.stringify({ findings: [], clean: true });
  const result = await reviewDiffForSecurity({ diffText: '+ const x = 1;', callModel });
  assert.equal(result.clean, true);
  assert.deepEqual(result.findings, []);
});

test('reviewDiffForSecurity: model throwing records ok:false and reports the error, does not throw itself', async () => {
  const pool = makeFakePool();
  const callModel = async () => { throw new Error('provider down'); };
  const result = await reviewDiffForSecurity({ diffText: '+ exec(x)', callModel, pool });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'provider down');
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(pool.inserts[0].ok, 0);
});

test('reviewDiffForSecurity: non-JSON model response records theater_detected and fails without throwing', async () => {
  const pool = makeFakePool();
  const callModel = async () => 'I refuse to answer in JSON, here is prose instead.';
  const result = await reviewDiffForSecurity({ diffText: '+ exec(x)', callModel, pool });
  assert.equal(result.ok, false);
  assert.ok(result.error.includes('non-JSON'));
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(pool.inserts[0].theater, 1);
});

test('reviewDiffForSecurity: no pool is a safe no-op, never throws', async () => {
  const callModel = async () => JSON.stringify({ findings: [], clean: true });
  const result = await reviewDiffForSecurity({ diffText: '+ x', callModel });
  assert.equal(result.ok, true);
});
