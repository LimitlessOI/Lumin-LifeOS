/**
 * SYNOPSIS: js — tests/founder-build-quorum-escalation.test.js.
 */
import assert from 'node:assert/strict';
import {
  FOUNDER_SOLO_ATTEMPT_MAX,
  parseQuorumResponse,
  runCfoEscalationGate,
  loadFounderBuildLessons,
  mergePlansByConfidence,
  pickCritic,
  parseCritiqueResponse,
  applyCritiqueToPlan,
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

function testMergePlansByConfidence() {
  const plans = [
    { plan: { augmented_task: 'a', confidence: 4 } },
    { plan: { augmented_task: 'b', confidence: 9 } },
    { plan: { augmented_task: 'c', confidence: 7 } },
  ];
  assert.equal(mergePlansByConfidence(plans).plan.augmented_task, 'b');
  assert.equal(mergePlansByConfidence([]), null);
}

function testPickCriticPrefersCrossVoice() {
  // Prefer claude_sonnet as the strong critic when present.
  assert.equal(pickCritic(['openai_builder_standard', 'claude_sonnet', 'gemini_flash']), 'claude_sonnet');
  // Avoid the plan's author when we can.
  assert.equal(pickCritic(['openai_builder_mini', 'deepseek'], 'deepseek'), 'openai_builder_mini');
  // Falls back to a member even if the only one is the avoided one.
  assert.equal(pickCritic(['deepseek'], 'deepseek'), 'deepseek');
  assert.equal(pickCritic([]), null);
}

function testCritiqueParseAndApply() {
  assert.equal(parseCritiqueResponse('no json').ok, false);
  assert.equal(parseCritiqueResponse('{"critique":"x"}').ok, false); // missing verdict

  const base = { augmented_task: 'do X', fix_approach: 'css_patch', confidence: 7 };

  // revise adopts the concrete revision
  const revised = parseCritiqueResponse('{"verdict":"revise","critique":"wrong file","revised_plan":{"augmented_task":"do Y","fix_approach":"target_reroute","confidence":8}}');
  const r = applyCritiqueToPlan(base, revised);
  assert.equal(r.plan.augmented_task, 'do Y');
  assert.equal(r.plan.critiqued, 'revised');

  // reject caps confidence so a later tier can still beat it
  const rejected = parseCritiqueResponse('{"verdict":"reject","critique":"cannot work"}');
  const j = applyCritiqueToPlan(base, rejected);
  assert.ok(j.plan.confidence <= 2);
  assert.equal(j.plan.critiqued, 'rejected');

  // approve annotates and keeps the plan
  const approved = parseCritiqueResponse('{"verdict":"approve","critique":"looks right"}');
  const a = applyCritiqueToPlan(base, approved);
  assert.equal(a.plan.augmented_task, 'do X');
  assert.equal(a.plan.critiqued, 'approved');

  // null critique leaves the plan untouched
  assert.deepEqual(applyCritiqueToPlan(base, null).plan, base);
}

async function run() {
  testSoloMaxIsThree();
  testParseQuorumResponse();
  await testCfoApprovesAfterThreeSolo();
  await testCfoBlocksHumanRequired();
  testMergePlansByConfidence();
  testPickCriticPrefersCrossVoice();
  testCritiqueParseAndApply();
  console.log('founder-build-quorum-escalation tests: PASS');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
