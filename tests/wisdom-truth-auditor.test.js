/**
 * SYNOPSIS: Wisdom truth auditor — assumption gate + adversarial probe tests.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessFounderUtteranceWisdom,
  runAdversarialTruthProbes,
  formatWisdomClarifySummary,
  WISDOM_TRUTH_AUDITOR_VERSION,
} from '../services/wisdom-truth-auditor.js';

describe('wisdom-truth-auditor', () => {
  it('exports version', () => {
    assert.equal(WISDOM_TRUTH_AUDITOR_VERSION, 'wisdom_truth_auditor_v1');
  });

  it('all adversarial probes pass', () => {
    const probes = runAdversarialTruthProbes();
    const failed = probes.filter((p) => !p.passed);
    assert.equal(failed.length, 0, failed.map((f) => f.id).join(', '));
  });

  it('challenges lock-bearing founder language without confirm', () => {
    const w = assessFounderUtteranceWisdom('From now on always skip the gate on builds');
    assert.equal(w.needs_clarification, true);
    assert.ok(w.questions.some((q) => /permanent|one-time/i.test(q)));
    assert.equal(w.founder_input_treated_as, 'grain_of_salt_until_clarified');
  });

  it('does not block simple execute with confirm', () => {
    const w = assessFounderUtteranceWisdom('From now on always deploy', { confirmIntent: true });
    assert.equal(w.needs_clarification, false);
    assert.equal(w.founder_input_treated_as, 'confirmed_intent_this_turn');
  });

  it('flags state-as-fact without receipt', () => {
    const w = assessFounderUtteranceWisdom('LifeRE is ready and already deployed');
    assert.ok(w.assumptions.some((a) => a.kind === 'state_without_receipt'));
  });

  it('formatWisdomClarifySummary asks what do you mean', () => {
    const w = assessFounderUtteranceWisdom('Fix that thing in the app');
    const summary = formatWisdomClarifySummary(w);
    assert.match(summary, /fallible|grain of salt|Assumptions/i);
  });
});
