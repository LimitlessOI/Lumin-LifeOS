/**
 * SYNOPSIS: Proves FACTORY_READY / MANUFACTURING_AUTHORIZED is a machine-verifiable
 * state rather than a model saying "looks good", and that the three-party consensus
 * cannot be satisfied by one office acting alone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compileManufacturingPlan,
  verifyManufacturingPlan,
  manufacturingPlanHash,
  computeWaves,
} from '../scripts/manufacturing-plan.mjs';
import { GATE_STATE, PLAN_DEFECT, FAILURE_DISPOSITION, REQUIRED_CONSENSUS_OFFICES } from '../config/manufacturing-plan-schema.js';

const blueprint = {
  blueprint_id: 'BP-TEST-1',
  _meta: { product: 'test-product', acceptance_cmd: 'node scripts/noop.mjs' },
  steps: [
    { id: 'S1', file: 'services/a.js', deps: [] },
    { id: 'S2', file: 'services/b.js', deps: ['S1'] },
    { id: 'S3', file: 'services/c.js', deps: ['S1'] },
    { id: 'S4', file: 'services/d.js', deps: ['S2', 'S3'] },
  ],
};

function sealAll(plan, offices = REQUIRED_CONSENSUS_OFFICES) {
  const hash = manufacturingPlanHash(plan);
  return { ...plan, consensus_seals: offices.map((office) => ({ office, plan_hash: hash })) };
}

test('compiled plan covers every blueprint step exactly once', () => {
  const plan = compileManufacturingPlan(blueprint);
  assert.equal(plan.slices.length, 4);
  const covered = plan.slices.flatMap((s) => s.steps).sort();
  assert.deepEqual(covered, ['S1', 'S2', 'S3', 'S4']);
});

test('waves express real parallelism: independent work shares a wave', () => {
  const plan = compileManufacturingPlan(blueprint);
  const { waves } = computeWaves(plan.slices.map((s) => ({ id: s.slice_id, depends_on: [] })));
  assert.equal(waves.length, 1, 'with no dependencies everything is one wave');
  const verified = verifyManufacturingPlan(sealAll(plan), blueprint);
  // S2 and S3 both depend only on S1, so they belong in the same derived wave.
  assert.equal(verified.derived_waves.length, 3, 'S1 | S2+S3 | S4');
  assert.equal(verified.derived_waves[1].length, 2);
});

test('integration points are where work rejoins, not every step', () => {
  const plan = compileManufacturingPlan(blueprint);
  assert.deepEqual(plan.integration_points.map((p) => p.step_id), ['S1']);
});

test('a complete, fully sealed plan reaches MANUFACTURING_AUTHORIZED', () => {
  const result = verifyManufacturingPlan(sealAll(compileManufacturingPlan(blueprint)), blueprint);
  assert.deepEqual(result.defects, []);
  assert.equal(result.state, GATE_STATE.MANUFACTURING_AUTHORIZED);
  assert.equal(result.manufacturing_authorized, true);
});

test('an unsealed plan is drafted, never authorized', () => {
  const result = verifyManufacturingPlan(compileManufacturingPlan(blueprint), blueprint);
  assert.equal(result.manufacturing_authorized, false);
  assert.equal(result.state, GATE_STATE.MANUFACTURING_PLAN_DRAFTED);
  assert.equal(result.defects.filter((d) => d.id === PLAN_DEFECT.MISSING_CONSENSUS_SEAL).length, 3);
});

test('two of three offices is not consensus', () => {
  for (const missing of REQUIRED_CONSENSUS_OFFICES) {
    const offices = REQUIRED_CONSENSUS_OFFICES.filter((o) => o !== missing);
    const result = verifyManufacturingPlan(sealAll(compileManufacturingPlan(blueprint), offices), blueprint);
    assert.equal(result.manufacturing_authorized, false, `${missing} must not be optional`);
    assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.MISSING_CONSENSUS_SEAL && d.office === missing));
  }
});

test('one office cannot supply another office\'s consent', () => {
  const plan = compileManufacturingPlan(blueprint);
  const hash = manufacturingPlanHash(plan);
  const doubled = {
    ...plan,
    consensus_seals: [
      { office: 'conductor', plan_hash: hash },
      { office: 'conductor', plan_hash: hash },
      { office: 'conductor', plan_hash: hash },
    ],
  };
  const result = verifyManufacturingPlan(doubled, blueprint);
  assert.equal(result.manufacturing_authorized, false);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.DUPLICATE_OFFICE_SEAL));
});

test('an unknown office cannot seal', () => {
  const plan = compileManufacturingPlan(blueprint);
  const hash = manufacturingPlanHash(plan);
  const result = verifyManufacturingPlan(
    { ...plan, consensus_seals: [...REQUIRED_CONSENSUS_OFFICES.map((o) => ({ office: o, plan_hash: hash })), { office: 'builder_assistant', plan_hash: hash }] },
    blueprint
  );
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.UNAUTHORIZED_SEAL_ISSUER));
});

test('approval does not transfer to an edited plan', () => {
  const plan = sealAll(compileManufacturingPlan(blueprint));
  const tampered = { ...plan, slices: plan.slices.map((s) => ({ ...s, target_files: ['services/somewhere-else.js'] })) };
  const result = verifyManufacturingPlan(tampered, blueprint);
  assert.equal(result.manufacturing_authorized, false);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.SEAL_PLAN_HASH_MISMATCH));
});

test('a plan compiled against different blueprint bytes is refused', () => {
  const plan = sealAll(compileManufacturingPlan(blueprint));
  const editedBlueprint = { ...blueprint, steps: [...blueprint.steps, { id: 'S5', file: 'services/e.js', deps: [] }] };
  const result = verifyManufacturingPlan(plan, editedBlueprint);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.BLUEPRINT_HASH_MISMATCH));
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.STEP_NOT_COVERED && d.step_id === 'S5'));
});

test('a step in no slice is reported: it would silently never be built', () => {
  const plan = sealAll(compileManufacturingPlan(blueprint));
  const dropped = { ...plan, slices: plan.slices.filter((s) => !s.steps.includes('S3')) };
  const result = verifyManufacturingPlan(dropped, blueprint);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.STEP_NOT_COVERED && d.step_id === 'S3'));
});

test('simultaneous writes to one file in the same wave are refused', () => {
  const collidingBlueprint = {
    ...blueprint,
    steps: [
      { id: 'S1', file: 'services/shared.js', deps: [] },
      { id: 'S2', file: 'services/shared.js', deps: [] },
    ],
  };
  const plan = sealAll(compileManufacturingPlan(collidingBlueprint));
  const result = verifyManufacturingPlan(plan, collidingBlueprint);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.PARALLEL_WRITE_COLLISION));
  assert.equal(result.manufacturing_authorized, false);
});

test('a mislabelled wave cannot hide a collision, because waves are re-derived', () => {
  const collidingBlueprint = {
    ...blueprint,
    steps: [
      { id: 'S1', file: 'services/shared.js', deps: [] },
      { id: 'S2', file: 'services/shared.js', deps: [] },
    ],
  };
  const plan = compileManufacturingPlan(collidingBlueprint);
  const lying = sealAll({
    ...plan,
    waves: [
      { wave_index: 0, slice_ids: ['SL-001'], parallel_safe: true },
      { wave_index: 1, slice_ids: ['SL-002'], parallel_safe: true },
    ],
  });
  const result = verifyManufacturingPlan(lying, collidingBlueprint);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.PARALLEL_WRITE_COLLISION));
});

test('a dependency cycle is reported rather than scheduled', () => {
  const cyclic = {
    ...blueprint,
    steps: [
      { id: 'S1', file: 'a.js', deps: ['S2'] },
      { id: 'S2', file: 'b.js', deps: ['S1'] },
    ],
  };
  const result = verifyManufacturingPlan(sealAll(compileManufacturingPlan(cyclic)), cyclic);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.DEPENDENCY_CYCLE));
});

test('continue_isolated is refused when other work depends on the slice', () => {
  const plan = compileManufacturingPlan(blueprint);
  const unsafe = sealAll({
    ...plan,
    slices: plan.slices.map((s) =>
      s.steps.includes('S1') ? { ...s, failure_disposition: FAILURE_DISPOSITION.CONTINUE_ISOLATED } : s
    ),
  });
  const result = verifyManufacturingPlan(unsafe, blueprint);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.UNSAFE_CONTINUE_ISOLATED));
});

test('an unknown failure_disposition cannot pass as a valid one', () => {
  const plan = compileManufacturingPlan(blueprint);
  const bad = sealAll({
    ...plan,
    slices: plan.slices.map((s) => ({ ...s, failure_disposition: 'keep_going_probably' })),
  });
  const result = verifyManufacturingPlan(bad, blueprint);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.INVALID_FAILURE_DISPOSITION));
});

test('outstanding blueprint defects block the plan: a plan cannot authorize unspecified work', () => {
  const result = verifyManufacturingPlan(sealAll(compileManufacturingPlan(blueprint)), blueprint, {
    inventionReport: { manufacturing_authorized: false, defect_count: 14, routing: { architect: 7 } },
  });
  assert.equal(result.manufacturing_authorized, false);
  assert.ok(result.defects.some((d) => d.id === PLAN_DEFECT.BLUEPRINT_DEFECTS_OUTSTANDING));
});

test('every defect is routed to an office, so nothing is an unowned flag', () => {
  const result = verifyManufacturingPlan({ schema: 'manufacturing_plan_v1' }, blueprint);
  assert.ok(result.defect_count > 0);
  assert.ok(result.defects.every((d) => typeof d.authority === 'string' && d.authority.length > 0));
  assert.ok(result.defects.every((d) => typeof d.detail === 'string' && d.detail.length > 0));
});

test('the whole defect set comes back at once, not the first problem only', () => {
  const result = verifyManufacturingPlan({ schema: 'manufacturing_plan_v1', slices: [] }, blueprint);
  const ids = new Set(result.defects.map((d) => d.id));
  assert.ok(ids.has(PLAN_DEFECT.MISSING_FIELD));
  assert.ok(ids.has(PLAN_DEFECT.STEP_NOT_COVERED));
  assert.ok(ids.has(PLAN_DEFECT.MISSING_CONSENSUS_SEAL));
  assert.ok(result.defects.length >= 10, 'a review that stops early forces the founder to run the loop N times');
});

test('the plan hash ignores seals, so sealing does not invalidate the thing sealed', () => {
  const plan = compileManufacturingPlan(blueprint);
  const before = manufacturingPlanHash(plan);
  assert.equal(manufacturingPlanHash(sealAll(plan)), before);
});

test('the verifier cannot mint a seal', async () => {
  const mod = await import('../scripts/manufacturing-plan.mjs');
  const minters = Object.keys(mod).filter((k) => /(mint|issue|create|sign)\w*Seal/i.test(k));
  assert.deepEqual(minters, [], 'the office that decides must not also be able to consent');
});

// ── Sealing authority (separate module by design) ────────────────────────────

test('the sealing authority lives outside the verifier and mints real seals', async () => {
  const { sealManufacturingPlan, OFFICE_JURISDICTION } = await import('../scripts/seal-manufacturing-plan.mjs');
  let plan = compileManufacturingPlan(blueprint);
  for (const office of REQUIRED_CONSENSUS_OFFICES) {
    ({ plan } = sealManufacturingPlan({ plan, office, basis: `${office} reviewed`, blueprint }));
  }
  const result = verifyManufacturingPlan(plan, blueprint);
  assert.equal(result.manufacturing_authorized, true);
  assert.deepEqual(result.consensus.obtained.sort(), [...REQUIRED_CONSENSUS_OFFICES].sort());
  assert.ok(plan.consensus_seals.every((s) => OFFICE_JURISDICTION[s.office]), 'each seal states its own jurisdiction');
});

test('adding a later seal does not invalidate the earlier ones', async () => {
  const { sealManufacturingPlan } = await import('../scripts/seal-manufacturing-plan.mjs');
  let plan = compileManufacturingPlan(blueprint);
  ({ plan } = sealManufacturingPlan({ plan, office: 'conductor', blueprint }));
  const firstHash = plan.consensus_seals[0].plan_hash;
  ({ plan } = sealManufacturingPlan({ plan, office: 'architect', blueprint }));
  assert.equal(plan.consensus_seals[0].plan_hash, firstHash);
  assert.equal(plan.consensus_seals[1].plan_hash, firstHash);
});

test('an office cannot seal twice, and an unknown office cannot seal at all', async () => {
  const { sealManufacturingPlan } = await import('../scripts/seal-manufacturing-plan.mjs');
  let plan = compileManufacturingPlan(blueprint);
  ({ plan } = sealManufacturingPlan({ plan, office: 'conductor', blueprint }));
  assert.throws(() => sealManufacturingPlan({ plan, office: 'conductor', blueprint }), /office_already_sealed/);
  assert.throws(() => sealManufacturingPlan({ plan, office: 'sentry', blueprint }), /unauthorized_office/);
});

test('an office cannot seal a structurally broken plan', async () => {
  const { sealManufacturingPlan } = await import('../scripts/seal-manufacturing-plan.mjs');
  const cyclic = { ...blueprint, steps: [{ id: 'S1', file: 'a.js', deps: ['S2'] }, { id: 'S2', file: 'b.js', deps: ['S1'] }] };
  const plan = compileManufacturingPlan(cyclic);
  assert.throws(
    () => sealManufacturingPlan({ plan, office: 'architect', blueprint: cyclic }),
    /plan_has_unresolved_defects/,
    'consent to a plan with an unresolved cycle is consent to nothing'
  );
});
