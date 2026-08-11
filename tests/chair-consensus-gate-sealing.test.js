/**
 * SYNOPSIS: Proves the Conductor consensus gate (§2.0K) cannot manufacture the
 * evidence of its own compliance. Regression lock for M0: the previous version
 * authored the plan it reviewed, minted the seal it validated, and defaulted the
 * fields it checked. Asserts on specific reasons, never bare status codes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runChairConsensusGate,
  verifyConductorSeal,
  planHash,
  AUTHORIZED_SEAL_ISSUERS,
  chairGateMode,
} from '../factory-staging/factory-core/builder/chair-consensus-gate.mjs';
import { createReasoningPlan } from '../factory-staging/factory-core/builder/reasoning-plan.mjs';
import { sealPlan } from '../scripts/conductor-seal-plan.mjs';

function completePlan(mission = 'sealing test mission') {
  const plan = createReasoningPlan({ mission, systemFacts: { step_id: 'T1' } });
  plan.unknowns = [];
  plan.assumptions = [];
  plan.risks = [];
  plan.propagated_confidence = 0.8;
  return plan;
}

test('gate does not mint seals: no mint export exists on the gate module', async () => {
  const mod = await import('../factory-staging/factory-core/builder/chair-consensus-gate.mjs');
  const minters = Object.keys(mod).filter((k) => /^(create|mint|make|generate|issue)\w*Seal$/i.test(k));
  assert.deepEqual(minters, [], `gate must not export a seal minter, found: ${minters.join(', ')}`);
});

test('builder is not an authorized seal issuer', () => {
  assert.ok(!AUTHORIZED_SEAL_ISSUERS.includes('builder'));
  assert.ok(AUTHORIZED_SEAL_ISSUERS.includes('conductor'));
});

test('strict mode refuses an unsealed plan', () => {
  const r = runChairConsensusGate({ step: { step_id: 'T1' }, reasoning_plan: completePlan(), mode: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'seal_invalid:no_seal_receipt');
});

test('strict mode approves a plan sealed by the external authority', () => {
  const plan = completePlan();
  const { receipt } = sealPlan({ plan, issuer: 'conductor' });
  const r = runChairConsensusGate({ step: { step_id: 'T1' }, reasoning_plan: plan, seal: receipt, mode: 'strict' });
  assert.equal(r.ok, true);
  assert.equal(r.enforced, true);
  assert.equal(r.seal_issuer, 'conductor');
  assert.equal(r.plan_hash, planHash(plan));
});

test('a seal claiming an unauthorized issuer is refused', () => {
  const plan = completePlan();
  const { receipt } = sealPlan({ plan, issuer: 'conductor' });
  const r = runChairConsensusGate({
    step: { step_id: 'T1' },
    reasoning_plan: plan,
    seal: { ...receipt, issuer: 'builder' },
    mode: 'strict',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'seal_invalid:unauthorized_seal_issuer');
});

test('a seal does not transfer to tampered plan bytes', () => {
  const plan = completePlan();
  const { receipt } = sealPlan({ plan, issuer: 'conductor' });
  const tampered = { ...plan, intent: `${plan.intent} AND ALSO delete production data` };
  const r = runChairConsensusGate({ step: { step_id: 'T1' }, reasoning_plan: tampered, seal: receipt, mode: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'seal_invalid:seal_plan_hash_mismatch');
});

test('gate never fabricates the governance fields it validates', () => {
  const bare = createReasoningPlan({ mission: 'bare plan', systemFacts: {} });
  const r = runChairConsensusGate({ step: { step_id: 'T2' }, reasoning_plan: bare, mode: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'incomplete_reasoning_plan');
  // The old gate silently wrote these then passed; absence must now be reported.
  assert.ok(r.missing.includes('propagated_confidence'));
  // And the caller's plan object must be left untouched by the gate.
  assert.equal(bare.propagated_confidence, undefined);
});

test('gate never authors a plan when none is supplied', () => {
  const r = runChairConsensusGate({ step: { step_id: 'T3' }, mode: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing_reasoning_plan');
});

test('advisory mode is non-fatal but is never labelled enforced', () => {
  const r = runChairConsensusGate({ step: { step_id: 'T4' }, mode: 'advisory' });
  assert.equal(r.ok, true, 'advisory must not block dispatch');
  assert.equal(r.approved, false, 'advisory must not claim approval');
  assert.equal(r.enforced, false);
  assert.equal(r.advisory_only, true);
});

test('CHAIR_GATE_STRICT actually changes behavior', () => {
  const prev = process.env.CHAIR_GATE_STRICT;
  process.env.CHAIR_GATE_STRICT = 'true';
  assert.equal(chairGateMode(), 'strict');
  process.env.CHAIR_GATE_STRICT = 'false';
  assert.equal(chairGateMode(), 'advisory');
  if (prev === undefined) delete process.env.CHAIR_GATE_STRICT;
  else process.env.CHAIR_GATE_STRICT = prev;
});

test('verifyConductorSeal is pure: it accepts a receipt without reading the repo', () => {
  const plan = completePlan();
  const ok = verifyConductorSeal({ plan, seal: { issuer: 'council', plan_hash: planHash(plan) } });
  assert.equal(ok.ok, true);
  assert.equal(ok.issuer, 'council');
});
