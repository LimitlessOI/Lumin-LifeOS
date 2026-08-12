/**
 * SYNOPSIS: js — tests/sentry-repair-handoff.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REPAIR_LANE,
  classifyRepairHandoff,
  conductorProblemPacket,
  compareRepairSolutions,
  applyRepairHandoff,
  readyForArchitect,
  sealConsensusRound,
} from '../config/sentry-repair-handoff.js';

test('simple native false-block: SENTRY sends issue + solution; Conductor does not re-solve', () => {
  const finding = {
    id: 'false_block:TALOA-BADGE-VOICE-001',
    check: 'system_still_working',
    proposed_solution: 'factory-1 shipped a factory-2 native file. Do not retry via ship-queue. Claim done if file_contains holds on HEAD.',
  };
  const c = classifyRepairHandoff(finding);
  assert.equal(c.lane, REPAIR_LANE.SEND_CONCLUSION);
  assert.equal(c.withhold_solution, false);
  const applied = applyRepairHandoff(finding);
  assert.equal(applied.conductor_status, 'accepted_sentry_conclusion');
  assert.equal(applied.conductor_packet.proposed_solution, finding.proposed_solution);
  assert.equal(readyForArchitect({ ...applied, chair_status: 'approved' }), true);
});

test('taloa dead is simple: send the conclusion, do not spin a second agent', () => {
  const c = classifyRepairHandoff({
    id: 'taloa_not_running',
    check: 'system_still_working',
    proposed_solution: 'open native/macos-overlay/build/Taloa.app from the factory-2 worktree.',
  });
  assert.equal(c.lane, REPAIR_LANE.SEND_CONCLUSION);
  assert.equal(c.reason, 'simple');
});

test('complicated CI failure withholds SENTRY solution so Conductor solves blind', () => {
  const finding = {
    id: 'ci_health:smoke-test.yml:abc',
    check: 'ci_health',
    summary: 'main smoke-test.yml is FAILING',
    proposed_solution: 'Read the failing run log and fix the root cause on main.',
  };
  const c = classifyRepairHandoff(finding);
  assert.equal(c.lane, REPAIR_LANE.DUAL_SOLVE);
  assert.equal(c.withhold_solution, true);
  const packet = conductorProblemPacket(finding, { withhold: true });
  assert.equal(packet.proposed_solution, undefined);
  assert.equal(packet.summary, finding.summary);
});

test('dual-solve consensus when both name the same file', () => {
  const compared = compareRepairSolutions(
    'Fix .github/workflows/smoke-test.yml YAML fences',
    'Remove markdown fences from .github/workflows/smoke-test.yml',
  );
  assert.equal(compared.consensus, true);
  assert.equal(compared.reason, 'shared_target');
});

test('dual-solve consensus is not broken by a trailing period on a playbook verb', () => {
  const compared = compareRepairSolutions(
    'Governed shipping lastTick is stale. The loop should reschedule.',
    'Reschedule the in-process governed shipping loop.',
  );
  assert.equal(compared.consensus, true);
  assert.equal(compared.reason, 'shared_playbook');
});

test('dual-solve dissent enters the consensus protocol — not a vote, not a panel-as-tiebreak', () => {
  const applied = applyRepairHandoff(
    {
      id: 'ci_health:x:abc',
      check: 'ci_health',
      proposed_solution: 'Rewrite the entire smoke-test.yml from scratch.',
    },
    { conductorSolution: 'Do not touch YAML. The failure is a flaky network assertion in tests/foo.test.js.' },
  );
  assert.equal(applied.conductor_status, 'consensus_protocol');
  assert.equal(applied.repair_lane, REPAIR_LANE.CONSENSUS_PROTOCOL);
  assert.equal(applied.forbidden_action, 'majority_vote');
  assert.equal(applied.consensus_protocol.threshold, 'unanimous_100_percent');
  assert.ok(applied.consensus_protocol.protocol.some((s) => s.includes('third solution')));
  assert.ok(applied.consensus_protocol.protocol.some((s) => s.includes('unintended consequences')));
  assert.equal(readyForArchitect({ ...applied, chair_status: 'approved' }), false);
});

test('two of three accepting is majority and is refused', () => {
  const sealed = sealConsensusRound({
    synthesized: 'Combine: fix the YAML fence and the flaky assertion in tests/foo.test.js.',
    sentry_accepts: true,
    conductor_accepts: true,
    other_accepts: [false],
  });
  assert.equal(sealed.unanimous, false);
  assert.equal(sealed.forbidden_action, 'majority_vote');
});

test('unanimous synthesis of both positions can seal', () => {
  const applied = applyRepairHandoff(
    {
      id: 'ci_health:x:abc',
      check: 'ci_health',
      proposed_solution: 'Rewrite the entire smoke-test.yml from scratch.',
      conductor_solution: 'Fix tests/foo.test.js instead.',
    },
    {
      consensusRound: {
        synthesized: 'Keep the workflow; fix the flaky assertion in tests/foo.test.js and the YAML fence.',
        sentry_accepts: true,
        conductor_accepts: true,
      },
    },
  );
  assert.equal(applied.repair_consensus, true);
  assert.equal(applied.consensus_round.reason, 'unanimous_100_percent');
  assert.equal(readyForArchitect({ ...applied, chair_status: 'approved' }), true);
});

test('manufacturing stopped is breaking: more officers, not a two-agent chat', () => {
  const c = classifyRepairHandoff({
    id: 'governed_loop_stale',
    check: 'system_still_working',
    proposed_solution: 'Governed shipping lastTick is older than 10m. Reschedule the in-process loop.',
  });
  assert.equal(c.lane, REPAIR_LANE.OFFICER_PANEL);
  assert.deepEqual(c.officers, ['sentry', 'conductor', 'architect', 'wisdom']);
  assert.equal(c.withhold_solution, false);
});

test('fixer still broken at 10m is a panel, not a sealed SENTRY conclusion', () => {
  const c = classifyRepairHandoff({
    id: 'fixer_unrepaired:governed_loop_stale',
    check: 'fixer_unrepaired',
    proposed_solution: 'The 5-minute fixer kick did not clear it. Name why the playbook failed.',
  });
  assert.equal(c.lane, REPAIR_LANE.OFFICER_PANEL);
});

test('founder-authority findings do not get a Conductor dual-solve', () => {
  const c = classifyRepairHandoff({
    id: 'empty_backlog:lifeos',
    check: 'product_backlog',
    proposed_solution: 'Chair should interview the founder for this product next priorities.',
  });
  assert.equal(c.lane, REPAIR_LANE.FOUNDER);
});
