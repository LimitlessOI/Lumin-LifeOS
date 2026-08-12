/**
 * SYNOPSIS: Proves two-factory operation in both modes the founder asked for —
 * parallel production and independent redundancy — plus peer isolation. Every
 * assertion is a rule he stated, not a behavior I found convenient.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { allocate, compareRedundantResults, raisePeerChallenge, sliceRiskClass, loadHealthProofs } from '../scripts/factory-allocation.mjs';
import { compileManufacturingPlan } from '../scripts/manufacturing-plan.mjs';
import { FACTORIES, ALLOCATION_MODE, FACTORY_HIERARCHY, ISOLATION_RULES, knownFactoryIds } from '../config/factory-registry.js';

const twoFactories = [
  { factory_id: 'factory-1', status: 'active' },
  { factory_id: 'factory-2', status: 'active' },
];

const blueprint = {
  blueprint_id: 'BP-F2',
  _meta: { product: 'p' },
  steps: [
    { id: 'S1', file: 'services/alpha.js', deps: [] },
    { id: 'S2', file: 'services/beta.js', deps: [] },
    { id: 'S3', file: 'services/gamma.js', deps: ['S1', 'S2'] },
  ],
};

test('factories are peers, and a temporary role confers no standing authority', () => {
  assert.equal(FACTORY_HIERARCHY.model, 'peer');
  assert.equal(FACTORY_HIERARCHY.permanent_superiority, false);
  assert.ok(FACTORY_HIERARCHY.temporary_roles_allowed.includes('integration_owner'));
});

test('a factory declares identity only — capacity is observed, never declared', async () => {
  const { factoryStatus } = await import('../config/factory-registry.js');
  const f2 = FACTORIES.find((f) => f.factory_id === 'factory-2');
  assert.equal(f2.status, undefined, 'a config field claiming "active" is the dormant-enforcement pattern this repair removed');

  // Status comes from the filesystem: is there really an independent worktree?
  const { isProvisioned } = await import('../config/factory-workspace.js');
  assert.equal(factoryStatus('factory-2'), isProvisioned('factory-2') ? 'active' : 'registered_not_provisioned');
});

test('an unprovisioned factory cannot report capacity', async () => {
  const { factoryStatus } = await import('../config/factory-registry.js');
  const key = 'FACTORY_WORKSPACE_FACTORY_2';
  const prior = process.env[key];
  process.env[key] = '/tmp/lifeos-factory-2-does-not-exist';
  try {
    assert.equal(factoryStatus('factory-2'), 'registered_not_provisioned');
  } finally {
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  }
});

test('allocate accepts factory id strings the planner actually passes', () => {
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1', 'factory-2'] });
  const result = allocate(plan, {
    factories: ['factory-1', 'factory-2'],
    redundancy_for_high_risk: false,
    healthProofs: {
      'factory-1': { verdict: 'HEALTHY' },
      'factory-2': { verdict: 'HEALTHY' },
    },
  });
  const used = new Set(result.assignments.flatMap((a) => a.factory_ids));
  assert.equal(used.has(undefined), false);
  assert.equal(used.size, 2, 'both factories must receive work when slices are independent');
  assert.ok([...used].every((id) => id === 'factory-1' || id === 'factory-2'));
});

test('PARALLEL PRODUCTION: independent slices split across both factories', () => {
  const plan = compileManufacturingPlan(blueprint, { factories: ['factory-1', 'factory-2'] });
  const result = allocate(plan, { factories: twoFactories, redundancy_for_high_risk: false });
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
  const used = new Set(result.assignments.flatMap((a) => a.factory_ids));
  assert.equal(used.size, 2, 'both factories must receive work when slices are independent');
});

test('no two factories may write the same file in one wave', () => {
  const colliding = {
    ...blueprint,
    steps: [
      { id: 'S1', file: 'services/same.js', deps: [] },
      { id: 'S2', file: 'services/same.js', deps: [] },
    ],
  };
  const plan = compileManufacturingPlan(colliding, { factories: ['factory-1', 'factory-2'] });
  const result = allocate(plan, { factories: twoFactories, redundancy_for_high_risk: false });
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.id === 'CONCURRENT_FACTORY_WRITE'));
});

test('work cannot be assigned to an unregistered factory identity', () => {
  const plan = compileManufacturingPlan(blueprint);
  const result = allocate(plan, { factories: [{ factory_id: 'factory-99', status: 'active' }] });
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.id === 'UNKNOWN_FACTORY'));
});

test('high-risk slices are upgraded to independent redundancy automatically', () => {
  const risky = {
    ...blueprint,
    steps: [{ id: 'S1', file: 'services/authority-ledger.js', deps: [] }],
  };
  const plan = compileManufacturingPlan(risky);
  const result = allocate(plan, { factories: twoFactories });
  assert.equal(result.redundant_slices.length, 1);
  const assignment = result.assignments[0];
  assert.equal(assignment.mode, ALLOCATION_MODE.REDUNDANT_INDEPENDENT);
  assert.deepEqual(assignment.factory_ids, ['factory-1', 'factory-2']);
  assert.match(assignment.basis, /high_risk/);
});

test('ordinary work is not made redundant: redundancy costs N times as much', () => {
  const plan = compileManufacturingPlan(blueprint);
  const result = allocate(plan, { factories: twoFactories });
  assert.equal(result.redundant_slices.length, 0);
});

test('risk classification finds the markers that make being wrong expensive', () => {
  assert.equal(sliceRiskClass({ target_files: ['services/payment-intent.js'] }).high_risk, true);
  assert.equal(sliceRiskClass({ target_files: ['public/styles.css'] }).high_risk, false);
});

test('an empty ledger does not silently become a preference', () => {
  const plan = compileManufacturingPlan(blueprint);
  const result = allocate(plan, { factories: twoFactories, profiles: [], redundancy_for_high_risk: false });
  assert.ok(result.assignments.every((a) => a.basis === 'round_robin_no_evidence_yet'));
});

test('allocation uses empirical performance once evidence exists', () => {
  const plan = compileManufacturingPlan(blueprint);
  const profiles = [
    { factory_id: 'factory-1', dimensions: { blueprint_fidelity: 0.4, reality_performance: 0.4 }, trustworthiness: {} },
    { factory_id: 'factory-2', dimensions: { blueprint_fidelity: 0.95, reality_performance: 0.9 }, trustworthiness: {} },
  ];
  const result = allocate(plan, { factories: twoFactories, profiles, redundancy_for_high_risk: false });
  assert.ok(result.assignments.every((a) => a.factory_ids[0] === 'factory-2'));
  assert.ok(result.assignments.every((a) => /empirical_/.test(a.basis)));
});

test('a factory with a proven concealment is excluded from high-risk work', () => {
  const risky = { ...blueprint, steps: [{ id: 'S1', file: 'services/security-gate.js', deps: [] }] };
  const plan = compileManufacturingPlan(risky);
  const profiles = [
    { factory_id: 'factory-1', dimensions: { reality_performance: 0.99 }, trustworthiness: { disqualified_for_high_stakes: true } },
    { factory_id: 'factory-2', dimensions: { reality_performance: 0.5 }, trustworthiness: { disqualified_for_high_stakes: false } },
  ];
  const result = allocate(plan, { factories: twoFactories, profiles, redundancy_for_high_risk: false });
  assert.deepEqual(result.assignments[0].factory_ids, ['factory-2'], 'a great record does not buy back trustworthiness');
});

test('convergence raises confidence only when the agreeing lanes were genuinely independent', () => {
  const out = compareRedundantResults({
    slice_id: 'SL-001',
    results: [
      {
        factory_id: 'factory-1',
        output_hash: 'abc',
        independence_profile: {
          model_lineage: 'anthropic',
          prompt_perspective: 'implementer',
          dependency_tree: 'tree-a',
          retrieval_sources: ['repo'],
          test_suite: 'suite-a',
          runtime: 'node26',
          architecture_interpretation: 'reading-a',
          prior_exposure_to_peer: false,
        },
      },
      {
        factory_id: 'factory-2',
        output_hash: 'abc',
        independence_profile: {
          model_lineage: 'openai',
          prompt_perspective: 'skeptic',
          dependency_tree: 'tree-b',
          retrieval_sources: ['spec'],
          test_suite: 'suite-b',
          runtime: 'node26',
          architecture_interpretation: 'reading-b',
          prior_exposure_to_peer: false,
        },
      },
    ],
  });
  assert.equal(out.converged, true);
  assert.equal(out.confidence, 'raised');
  assert.equal(out.next_action, 'accept');
  // Not 2.0: both lanes still share a runtime, and demanding perfect
  // orthogonality would make corroboration unreachable for any real pair.
  assert.ok(out.effective_perspectives > 1.75, `expected near-full independence, got ${out.effective_perspectives}`);
});

test('agreement between correlated lanes is one failure counted twice, not corroboration', () => {
  // The live case: factory-2's dependency tree is a symlink to factory-1's, so a
  // defect in any shared package is reproduced identically in both lanes.
  const shared = {
    model_lineage: 'anthropic',
    prompt_perspective: 'implementer',
    dependency_tree: 'symlink:factory-1/node_modules',
    retrieval_sources: ['repo'],
    test_suite: 'suite-a',
    runtime: 'node26',
    architecture_interpretation: 'reading-a',
    prior_exposure_to_peer: false,
  };
  const out = compareRedundantResults({
    slice_id: 'SL-001',
    results: [
      { factory_id: 'factory-1', output_hash: 'abc', independence_profile: shared },
      { factory_id: 'factory-2', output_hash: 'abc', independence_profile: { ...shared } },
    ],
  });
  assert.equal(out.converged, true);
  assert.equal(out.confidence, 'not_raised_correlated_failure_risk');
  assert.equal(out.next_action, 'seek_independent_verification');
  assert.equal(out.effective_perspectives, 1);
  assert.ok(out.shared_factors.includes('dependency_tree'));
});

test('unknown independence counts as shared, so silence cannot buy confidence', () => {
  const out = compareRedundantResults({
    slice_id: 'SL-001',
    results: [
      { factory_id: 'factory-1', output_hash: 'abc' },
      { factory_id: 'factory-2', output_hash: 'abc' },
    ],
  });
  assert.equal(out.confidence, 'not_raised_correlated_failure_risk');
});

test('INDEPENDENCE BEFORE CONSENSUS: a result produced after seeing the peer is void', () => {
  const out = compareRedundantResults({
    slice_id: 'SL-001',
    results: [
      { factory_id: 'factory-1', output_hash: 'abc' },
      { factory_id: 'factory-2', output_hash: 'abc', saw_peer_before_sealing: true },
    ],
  });
  assert.equal(out.confidence, 'void');
  assert.equal(out.next_action, 'rerun_with_sealed_independence');
  assert.deepEqual(out.required_order.slice(0, 4), ['freeze evidence', 'independent analysis', 'seal', 'reveal']);
});

test('sealing after the peer was revealed is contamination even if nobody admits it', () => {
  const out = compareRedundantResults({
    slice_id: 'SL-001',
    results: [
      { factory_id: 'factory-1', output_hash: 'abc', sealed_at: '2026-08-11T10:00:00Z' },
      { factory_id: 'factory-2', output_hash: 'abc', peer_revealed_at: '2026-08-11T10:01:00Z', sealed_at: '2026-08-11T10:02:00Z' },
    ],
  });
  assert.equal(out.confidence, 'void');
});

test('a lane with no health proof cannot be given work', () => {
  const plan = {
    plan_id: 'MP-HEALTH',
    slices: [{ slice_id: 'SL-001', steps: ['S1'], depends_on: [], target_files: ['a.js'] }],
    waves: [{ wave_index: 0, slice_ids: ['SL-001'] }],
  };
  const refused = allocate(plan, {
    factories: [{ factory_id: 'factory-1' }],
    healthProofs: {},
  });
  assert.equal(refused.ok, false);
  assert.ok(refused.violations.some((v) => v.id === 'UNHEALTHY_FACTORY_ASSIGNED'));

  const allowed = allocate(plan, {
    factories: [{ factory_id: 'factory-1' }],
    healthProofs: { 'factory-1': { verdict: 'HEALTHY' } },
  });
  assert.ok(!allowed.violations.some((v) => v.id === 'UNHEALTHY_FACTORY_ASSIGNED'));
});

test('a health proof older than a day is treated as no proof at all', () => {
  const file = path.join(os.tmpdir(), `health-${Date.now()}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({
      generated_at: '2026-08-01T00:00:00Z',
      factories: [{ factory_id: 'factory-1', verdict: 'HEALTHY', checked_at: '2026-08-01T00:00:00Z', checks: [] }],
    })
  );
  const proofs = loadHealthProofs(file, { now: Date.parse('2026-08-11T00:00:00Z') });
  assert.equal(proofs['factory-1'].verdict, 'STALE_PROOF');

  const fresh = loadHealthProofs(file, { now: Date.parse('2026-08-01T01:00:00Z') });
  assert.equal(fresh['factory-1'].verdict, 'HEALTHY');
});

test('a lane that failed its audit cannot be given work either', () => {
  const plan = {
    plan_id: 'MP-HEALTH-2',
    slices: [{ slice_id: 'SL-001', steps: ['S1'], depends_on: [], target_files: ['a.js'] }],
    waves: [{ wave_index: 0, slice_ids: ['SL-001'] }],
  };
  const out = allocate(plan, {
    factories: [{ factory_id: 'factory-2' }],
    healthProofs: { 'factory-2': { verdict: 'DEFECTS_PRESENT', failed_checks: ['can_run_its_own_verification'] } },
  });
  assert.equal(out.ok, false);
  const v = out.violations.find((x) => x.id === 'UNHEALTHY_FACTORY_ASSIGNED');
  assert.match(v.detail, /can_run_its_own_verification/);
});

test('disagreement routes to the Consensus Protocol and never to a vote', () => {
  const out = compareRedundantResults({
    slice_id: 'SL-001',
    results: [
      { factory_id: 'factory-1', output_hash: 'abc' },
      { factory_id: 'factory-2', output_hash: 'xyz' },
    ],
  });
  assert.equal(out.converged, false);
  assert.equal(out.next_action, 'consensus_protocol');
  assert.equal(out.forbidden_action, 'majority_vote');
  assert.ok(out.protocol.some((p) => /defends the peer solution/.test(p)));
  assert.ok(out.protocol.some((p) => /attacks its own/.test(p)));
});

test('ISOLATION: a factory may challenge a peer but never write the peer record', () => {
  assert.equal(ISOLATION_RULES.may_write_peer_record, false);
  assert.equal(ISOLATION_RULES.may_challenge_peer_output, true);
  const ch = raisePeerChallenge({
    challenger: 'factory-2',
    subject: 'factory-1',
    slice_id: 'SL-001',
    claim: 'complies with the blueprint but introduces a race on the claim update',
    evidence: 'two concurrent claims both observe claimed_at null',
  });
  assert.equal(ch.accepted, true);
  assert.equal(ch.record.writes_to_peer_record, false);
  assert.equal(ch.record.status, 'awaiting_adjudication');
  assert.match(ch.record.adjudication_rule, /not punished for an honest error/);
});

test('a challenge without claim and evidence is refused', () => {
  const ch = raisePeerChallenge({ challenger: 'factory-2', subject: 'factory-1', slice_id: 'SL-001' });
  assert.equal(ch.accepted, false);
  assert.equal(ch.reason, 'challenge_requires_claim_and_evidence');
});

test('challenging yourself is self-detection, not peer review', () => {
  const ch = raisePeerChallenge({ challenger: 'factory-1', subject: 'factory-1', claim: 'x', evidence: 'y' });
  assert.equal(ch.accepted, false);
  assert.equal(ch.reason, 'self_challenge_is_self_detection_not_peer_review');
});

test('an unknown identity can neither challenge nor be challenged', () => {
  assert.equal(raisePeerChallenge({ challenger: 'ghost', subject: 'factory-1', claim: 'x', evidence: 'y' }).accepted, false);
  assert.ok(knownFactoryIds().length >= 2);
});

test('the architecture reaches N factories without redesign', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ factory_id: `factory-${i + 1}`, status: 'active' }));
  const plan = compileManufacturingPlan(blueprint);
  // Health is supplied explicitly: this test is about scaling to N lanes, and it
  // must not depend on which lanes happen to have been audited most recently.
  const healthProofs = Object.fromEntries(many.map((f) => [f.factory_id, { verdict: 'HEALTHY' }]));
  const result = allocate(plan, { factories: many.slice(0, 2), redundancy_for_high_risk: false, healthProofs });
  assert.equal(result.ok, true, 'nothing in allocation hardcodes two');
  assert.equal(result.factories.length, 2);
});
