import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REPAIR_LANE,
  applyRepairHandoff,
  readyForArchitect,
  sealConsensusRound,
} from '../config/sentry-repair-handoff.js';
import { runAutonomousRecoveryCouncil } from '../services/autonomous-recovery-council.js';

const complexFinding = {
  id: 'fixer_failed:governed_loop_stale',
  check: 'fixer_failed',
  severity: 'P0',
  summary: 'factory stopped',
  proposed_solution: 'restart services/never-stop-product-factory-scheduler.js and verify a fresh tick',
  chair_status: 'approved', // legacy storage field; semantic owner is Conductor
};

test('matching independent SENTRY and Conductor solutions cannot terminate early', () => {
  const result = applyRepairHandoff(complexFinding, {
    conductorSolution: 'restart services/never-stop-product-factory-scheduler.js then verify progress',
  });
  assert.equal(result.repair_consensus, false);
  assert.equal(result.repair_lane, REPAIR_LANE.CONSENSUS_PROTOCOL);
  assert.equal(result.conductor_status, 'hidden_alternatives_required');
  assert.equal(result.forbidden_action, 'early_consensus_terminal');
  assert.equal(readyForArchitect(result), false);
});

test('consensus cannot seal without hidden-alternative/consequence evidence', () => {
  const sealed = sealConsensusRound({
    synthesized: 'restart the scheduler and verify the next slice',
    sentry_accepts: true,
    conductor_accepts: true,
  });
  assert.equal(sealed.unanimous, false);
  assert.equal(sealed.reason, 'hidden_alternatives_not_cleared');
});

test('unanimous 1+1=3 synthesis can hand off only after Conductor approval', () => {
  const pending = applyRepairHandoff(complexFinding, {
    conductorSolution: 'restart services/never-stop-product-factory-scheduler.js then verify progress',
  });
  const result = applyRepairHandoff(pending, {
    consensusRound: {
      synthesized: 'restart via the supervised launcher, then require two fresh slice receipts before declaring recovery',
      sentry_accepts: true,
      conductor_accepts: true,
      argued_both_sides: true,
      unintended_positive: 'proves recovery rather than mere process liveness',
      unintended_negative: 'adds a small delay before declaring the system recovered',
    },
  });
  assert.equal(result.repair_consensus, true);
  assert.equal(result.conductor_status, 'consensus');
  assert.equal(result.next_action, 'architect_handoff');
  assert.equal(readyForArchitect(result), true);
});

test('autonomous recovery re-verifies until recovered and never routes founder as the mechanism', async () => {
  let calls = 0;
  const audit = async () => {
    calls += 1;
    if (calls === 1) return { raw_findings: 1, escalations: 0 };
    return { raw_findings: 0, escalations: 0 };
  };
  const result = await runAutonomousRecoveryCouncil({ audit, maxRounds: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.disposition, 'RECOVERED');
  assert.equal(calls, 2);
});

test('exhausted autonomous recovery records UNSOLVED without authorizing terminal stop', async () => {
  const audit = async () => ({ raw_findings: 1, escalations: 1 });
  const result = await runAutonomousRecoveryCouncil({ audit, maxRounds: 2 });
  assert.equal(result.ok, false);
  assert.equal(result.disposition, 'UNSOLVED');
  assert.equal(result.founder_alert_is_record_only, true);
  assert.equal(result.terminal_stop_forbidden, true);
});
