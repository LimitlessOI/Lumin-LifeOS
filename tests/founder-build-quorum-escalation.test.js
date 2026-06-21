/**
 * SYNOPSIS: js — tests/founder-build-quorum-escalation.test.js.
 */
import assert from 'node:assert/strict';
import {
  FOUNDER_SOLO_ATTEMPT_MAX,
  parseQuorumResponse,
  runCfoEscalationGate,
  loadFounderBuildLessons,
} from '../services/founder-build-quorum-escalation.js';
import { DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS } from '../services/founder-build-self-repair.js';

function testSoloMaxIsThree() {
  assert.equal(FOUNDER_SOLO_ATTEMPT_MAX, 3);
  assert.equal(DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS, 3);
}

function testParseQuorumResponse() {
  const ok = parseQuorumResponse(`Analysis here {"root_cause":"sw cache","fix_approach":"css_patch","target_files":["public/overlay/sw.js"],"augmented_task":"bump CACHE_NAME and recommit 4 files","confidence":8}`);
  assert.equal(ok.ok, true);
  assert.equal(ok.plan.fix_approach, 'css_patch');
  assert.equal(parseQuorumResponse('no json').ok, false);
}

async function testCfoApprovesAfterThreeSolo() {
  const lessons = await loadFounderBuildLessons(null);
  const approved = await runCfoEscalationGate({
    soloAttempts: [{ attempt: 1 }, { attempt: 2 }, { attempt: 3 }],
    blocker: 'FOUNDER_VISUAL_NOT_VERIFIED',
    lessons,
    pool: null,
  });
  assert.equal(approved.approved, true);
  assert.match(approved.roi_note, /quorum/i);

  const denied = await runCfoEscalationGate({
    soloAttempts: [{ attempt: 1 }],
    blocker: 'FOUNDER_VISUAL_NOT_VERIFIED',
    lessons,
    pool: null,
  });
  assert.equal(denied.approved, false);
  assert.equal(denied.code, 'CFO_SOLO_BUDGET_REMAINING');
}

async function testCfoBlocksHumanRequired() {
  const lessons = await loadFounderBuildLessons(null);
  const blocked = await runCfoEscalationGate({
    soloAttempts: [{ attempt: 1 }, { attempt: 2 }, { attempt: 3 }],
    blocker: 'ADAM_REQUIRED: set Railway secret',
    lessons,
    pool: null,
  });
  assert.equal(blocked.approved, false);
  assert.equal(blocked.code, 'CFO_BLOCKED_HUMAN_REQUIRED');
}

async function run() {
  testSoloMaxIsThree();
  testParseQuorumResponse();
  await testCfoApprovesAfterThreeSolo();
  await testCfoBlocksHumanRequired();
  console.log('founder-build-quorum-escalation tests: PASS');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
