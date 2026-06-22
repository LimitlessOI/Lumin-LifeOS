/**
 * SYNOPSIS: js — tests/chair-truth-gate.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceChairTruthExit, executionKindForChannel } from '../services/chair-truth-gate.js';
import { expandFounderBuildTask } from '../services/founder-chair-intent.js';
import { classifyChairIntent } from '../services/lumin-chair-orchestrator.js';

test('mission_pipeline is RECEIPT_SCAN_ONLY', () => {
  assert.equal(executionKindForChannel('mission_pipeline'), 'RECEIPT_SCAN_ONLY');
});

test('blocks PASS when pipeline claims founder alpha without receipt', () => {
  const out = enforceChairTruthExit({
    pass_fail: 'PASS',
    ok: true,
    founder_usability_pass: false,
    machine_path_pass: true,
    receipt_truth: 'POINT_B_REACHED',
    human_summary: 'Point B reached — LifeRE Alpha. Founder success test satisfied.',
  }, 'mission_pipeline');
  assert.equal(out.pass_fail, 'FAIL');
  assert.equal(out.ok, false);
  assert.equal(out.execution_kind, 'RECEIPT_SCAN_ONLY');
  assert.ok(out.truth_gate_violation);
});

test('LifeRE usability language expands to lifere.html target', () => {
  const task = expandFounderBuildTask('LifeRE should auto-load daily command center on open');
  assert.match(task, /target_file: public\/overlay\/lifeos-lifere\.html/);
});

test('auto-load on open routes build_async not mission_pipeline', () => {
  const msg = 'LifeRE should auto-load daily command center on open';
  assert.equal(classifyChairIntent({ cleanedInput: msg }), 'build_async');
});

test('explicit action build forces build_async', () => {
  assert.equal(
    classifyChairIntent({ cleanedInput: 'what is the status of Point B', explicitAction: 'build' }),
    'build_async',
  );
});

console.log('✅ chair-truth-gate.test.js passed');
