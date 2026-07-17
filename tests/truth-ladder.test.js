/**
 * SYNOPSIS: js — tests/truth-ladder.test.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRADES,
  normalizeGrade,
  gradeRank,
  requiresProof,
  claimKind,
  hasProof,
  enforceClaim,
  reviewClaims,
  toWatchlist,
  summarizeGrades,
  dualHonestyGrade,
  blueprintFollowClaim,
} from '../services/truth-ladder.js';

test('normalizeGrade accepts canonical + synonyms, rejects junk', () => {
  assert.equal(normalizeGrade('know'), GRADES.KNOW);
  assert.equal(normalizeGrade('verified'), GRADES.KNOW);
  assert.equal(normalizeGrade('inference'), GRADES.THINK);
  assert.equal(normalizeGrade('canonical'), GRADES.LAW);
  assert.equal(normalizeGrade("don't-know".replace("'", '')), GRADES.DONT_KNOW);
  assert.equal(normalizeGrade('banana'), null);
});

test('gradeRank orders the ladder', () => {
  assert.ok(gradeRank('GUESS') < gradeRank('THINK'));
  assert.ok(gradeRank('THINK') < gradeRank('KNOW'));
  assert.ok(gradeRank('KNOW') < gradeRank('LAW'));
  assert.equal(requiresProof('KNOW'), true);
  assert.equal(requiresProof('THINK'), false);
});

test('claimKind separates execution-provable from external', () => {
  assert.equal(claimKind({ kind: 'deploy' }), 'execution');
  assert.equal(claimKind({ kind: 'market' }), 'external');
  assert.equal(claimKind({ text: 'the /ready endpoint returns the deploy sha' }), 'execution');
  assert.equal(claimKind({ text: 'wellness owners prefer warm palettes' }), 'external');
});

test('hasProof recognizes commit sha / test pass / deploy / citation', () => {
  assert.equal(hasProof({ proof: { commit_sha: 'abc' } }), true);
  assert.equal(hasProof({ proof: { test_result: 'pass' } }), true);
  assert.equal(hasProof({ proof: { deploy_verified: true } }), true);
  assert.equal(hasProof({ proof: 'https://x/evidence' }), true);
  assert.equal(hasProof({ proof: { test_result: 'fail' } }), false);
  assert.equal(hasProof({}), false);
});

test('enforceClaim downgrades KNOW without proof (execution -> GUESS)', () => {
  const r = enforceClaim({ id: '1', kind: 'build', text: 'site built', grade: 'KNOW' });
  assert.equal(r.grade, GRADES.GUESS);
  assert.equal(r.enforced, true);
  assert.ok(r.flags.includes('claimed_KNOW_or_LAW_without_proof'));
});

test('enforceClaim keeps KNOW when proof present', () => {
  const r = enforceClaim({ id: '1', kind: 'build', text: 'site built', grade: 'KNOW', proof: { commit_sha: 'd0052b0' } });
  assert.equal(r.grade, GRADES.KNOW);
  assert.equal(r.enforced, false);
});

test('enforceClaim caps external KNOW-claim without evidence at THINK', () => {
  const r = enforceClaim({ id: '2', kind: 'market', text: 'users want X', grade: 'KNOW' });
  assert.equal(r.grade, GRADES.THINK);
  assert.ok(r.flags.length >= 1);
});

test('reviewClaims uses injected reviewer then enforces; missing grade -> GUESS', async () => {
  const claims = [
    { id: 'a', kind: 'deploy', text: 'deploy serves sha', proof: { deploy_verified: true } },
    { id: 'b', kind: 'market', text: 'this converts better' },
  ];
  const reviewFn = async () => [
    { id: 'a', grade: 'KNOW' },
    { id: 'b', grade: 'LAW' }, // reviewer over-graded an unprovable external claim
  ];
  const out = await reviewClaims(claims, { reviewFn });
  assert.equal(out.find((c) => c.id === 'a').grade, GRADES.KNOW);
  assert.equal(out.find((c) => c.id === 'b').grade, GRADES.THINK, 'external over-grade capped');
});

test('reviewClaims fail-safe: broken reviewer -> everything GUESS, never optimistic', async () => {
  const out = await reviewClaims([{ id: 'a', text: 'x' }], { reviewFn: async () => { throw new Error('down'); } });
  assert.equal(out[0].grade, GRADES.GUESS);
});

test('toWatchlist captures everything below KNOW and flags execution items urgent', () => {
  const enforced = [
    enforceClaim({ id: 'a', kind: 'deploy', text: 'built', grade: 'KNOW', proof: { commit_sha: 'x' } }),
    enforceClaim({ id: 'b', kind: 'market', text: 'users want X', grade: 'THINK' }),
    enforceClaim({ id: 'c', kind: 'build', text: 'compiles', grade: 'KNOW' }), // no proof -> GUESS
  ];
  const wl = toWatchlist(enforced, { now: () => 'T' });
  const ids = wl.map((w) => w.id).sort();
  assert.deepEqual(ids, ['b', 'c']);
  assert.equal(wl.find((w) => w.id === 'c').urgent, true);
  assert.equal(wl.find((w) => w.id === 'b').urgent, false);
});

test('summarizeGrades counts + enforced', () => {
  const enforced = [
    enforceClaim({ id: 'a', kind: 'deploy', grade: 'KNOW', proof: { commit_sha: 'x' } }),
    enforceClaim({ id: 'b', kind: 'market', grade: 'KNOW' }),
  ];
  const s = summarizeGrades(enforced);
  assert.equal(s.total, 2);
  assert.equal(s.KNOW, 1);
  assert.equal(s.THINK, 1);
  assert.equal(s.enforced, 1);
});

test('dualHonestyGrade: trust withheld without peer + proof', async () => {
  const out = await dualHonestyGrade({
    actor_id: 'factory',
    claim: 'shipped step',
    self_grade: 'KNOW',
    kind: 'deploy',
  });
  assert.equal(out.trust_earned, false);
  assert.equal(out.peer.grade, GRADES.GUESS);
  assert.equal(out.compare.agree, false);
});

test('dualHonestyGrade: agree + receipts → trust_earned', async () => {
  const out = await dualHonestyGrade({
    actor_id: 'factory',
    claim: 'shipped step',
    self_grade: 'KNOW',
    kind: 'deploy',
    evidence: { commit_sha: 'abc', test_result: 'pass' },
  }, {
    peerReviewFn: async () => ({ grade: 'KNOW', rationale: 'sentry_PASS+sha' }),
  });
  assert.equal(out.trust_earned, true);
  assert.equal(out.compare.agree, true);
  assert.equal(out.compare.effective_grade, GRADES.KNOW);
});

test('blueprintFollowClaim: missing twin ids → NOT_ON_BLUEPRINT', () => {
  const miss = blueprintFollowClaim({ claim_following_blueprint: true });
  assert.equal(miss.ok, false);
  assert.equal(miss.status, 'NOT_ON_BLUEPRINT');
});

test('blueprintFollowClaim: synthetic governed-autonomous-* → NOT_ON_BLUEPRINT', () => {
  const syn = blueprintFollowClaim({
    blueprint_id: 'governed-autonomous-lifeos',
    blueprint_step_id: 's12',
    claim_following_blueprint: true,
  });
  assert.equal(syn.ok, false);
  assert.equal(syn.status, 'NOT_ON_BLUEPRINT');
  assert.match(syn.error, /synthetic/);
});

test('blueprintFollowClaim: registered product BUILD_QUEUE twin + real step → ON_BLUEPRINT', () => {
  const ok = blueprintFollowClaim({
    blueprint_id: 'PRODUCT-LIFEOS-BUILD-QUEUE-TWIN-V1',
    blueprint_step_id: 's01',
    claim_following_blueprint: true,
  });
  assert.equal(ok.ok, true, ok.error);
  assert.equal(ok.status, 'ON_BLUEPRINT');
  assert.equal(ok.twin_source, 'product_build_queue_twin');
});

test('blueprintFollowClaim: real mission twin + real step → ON_BLUEPRINT', () => {
  const ok = blueprintFollowClaim({
    blueprint_id: 'PRODUCT-LIFEOS-USER-AUTH-V1-0001-ARC-HOST',
    blueprint_step_id: 'UAT-001',
    claim_following_blueprint: true,
  });
  assert.equal(ok.ok, true, ok.error);
  assert.equal(ok.status, 'ON_BLUEPRINT');
  assert.equal(ok.twin_source, 'mission_blueprint');
});

test('blueprintFollowClaim: unknown step on real twin → NOT_ON_BLUEPRINT', () => {
  const bad = blueprintFollowClaim({
    blueprint_id: 'PRODUCT-LIFEOS-BUILD-QUEUE-TWIN-V1',
    blueprint_step_id: 'not-a-real-step-zzz',
    claim_following_blueprint: true,
  });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /blueprint_step_id_not_on_twin/);
});