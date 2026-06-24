/**
 * SYNOPSIS: Truth lockdown — fail-closed compliance tests.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceTruthLockdown,
  assertTruthLockdownCompliance,
  TRUTH_LOCKDOWN_VERSION,
} from '../services/truth-lockdown.js';

describe('truth-lockdown', () => {
  it('exports version stamp', () => {
    assert.equal(TRUTH_LOCKDOWN_VERSION, 'truth_lockdown_v1');
  });

  it('downgrades PASS when NO_COMMAND_RAN', () => {
    const out = enforceTruthLockdown({
      pass_fail: 'PASS',
      ok: true,
      command_truth: 'NO_COMMAND_RAN',
      human_summary: 'All good.',
    }, 'chair');
    assert.notEqual(out.pass_fail, 'PASS');
    assert.equal(out.truth_gate_violation, 'PASS_WITHOUT_COMMAND');
  });

  it('strips open LifeRE theater on counsel path', () => {
    const out = enforceTruthLockdown({
      pass_fail: 'NO_COMMAND_RAN',
      command_truth: 'NO_COMMAND_RAN',
      human_summary_technical: 'LifeOS is now open. What would you like to do first?',
      chair_channel: 'chair',
    }, 'chair');
    assert.equal(out.theater_blocked, true);
    assert.doesNotMatch(out.human_summary_technical || '', /LifeOS is now open/i);
  });

  it('FAIL always carries a lesson', () => {
    const out = enforceTruthLockdown({
      pass_fail: 'FAIL',
      ok: false,
      command_truth: 'NO_COMMAND_RAN',
      first_blocker: 'FP V2 gate blocked execute',
    }, 'build_async');
    assert.ok(out.execution_receipt?.lesson);
    assert.match(out.execution_receipt.lesson, /FAIL|scoreboard|blocker/i);
  });

  it('blocks false success prose on FAIL', () => {
    const out = enforceTruthLockdown({
      pass_fail: 'FAIL',
      ok: false,
      command_truth: 'BUILD_ATTEMPTED',
      done_synopsis: 'Successfully completed the build.',
      human_summary_technical: 'Build has been executed and deployed to production.',
    }, 'build_async');
    assert.doesNotMatch(out.done_synopsis || '', /Successfully completed/i);
    assert.equal(out.truth_gate_violation, 'FAIL_SYNOPSIS_THEATER');
  });

  it('blocks founder alpha claim without usability pass', () => {
    const out = enforceTruthLockdown({
      pass_fail: 'PASS',
      ok: true,
      founder_usability_pass: false,
      command_truth: 'COMMAND_RAN',
      human_summary: 'Point B reached — founder success test satisfied.',
    }, 'mission_pipeline');
    assert.equal(out.pass_fail, 'FAIL');
    assert.ok(out.truth_gate_violation);
  });

  it('assertTruthLockdownCompliance downgrades illegal PASS on build channel', () => {
    const locked = assertTruthLockdownCompliance({
      pass_fail: 'PASS',
      ok: true,
      command_truth: 'COMMITTED',
      human_summary: 'Shipped.',
    }, 'build_async');
    assert.equal(locked.pass_fail, 'FAIL');
    assert.equal(locked.truth_gate_violation, 'BUILD_PASS_WITHOUT_SHA');
  });

  it('passes honest counsel', () => {
    const locked = assertTruthLockdownCompliance({
      pass_fail: 'NO_COMMAND_RAN',
      command_truth: 'NO_COMMAND_RAN',
      human_summary_technical: 'Oil changes every 5k miles — check your manual.',
    }, 'chair');
    assert.equal(locked.truth_lockdown_applied, true);
  });
});
