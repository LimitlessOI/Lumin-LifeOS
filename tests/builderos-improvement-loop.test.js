/**
 * SYNOPSIS: js — tests/builderos-improvement-loop.test.js.
 */
import assert from 'node:assert/strict';
import { buildBuilderOSImprovementLoopStatus } from '../services/builderos-improvement-loop.js';

function testImprovementLoopBuildsConsensusQueue() {
  const report = buildBuilderOSImprovementLoopStatus({
    readiness: {
      blockers: [
        { code: 'BP_PRIORITY_SCHEDULER_DISABLED', detail: 'scheduler off' },
        { code: 'TELEMETRY_GAPS_REMAIN', detail: 'metrics missing' },
      ],
      warnings: [{ code: 'LOCAL_PROOF_ONLY', detail: 'operator shell drift' }],
      fake_green_risks: ['Legacy route can look canonical.'],
    },
    schedulerStatus: {
      scheduler: {
        enabled: false,
        healthy: false,
        queue_has_incomplete_work: true,
        running: false,
        receipt: null,
      },
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.consensus_contract.required, true);
  assert.ok(report.proposals.length >= 3);
  assert.equal(report.proposals[0].source_code, 'BP_PRIORITY_SCHEDULER_DISABLED');
  assert.equal(report.departments.CFO.queue_has_incomplete_work, true);
}

testImprovementLoopBuildsConsensusQueue();
console.log('builderos-improvement-loop tests: PASS');
