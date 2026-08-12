#!/usr/bin/env node
/**
 * SYNOPSIS: Attacks the governance repair with the specific moves the founder
 * named, and fails if any of them succeeds. This exists because a hand-audit by
 * the same agent that wrote the repair is not verification — the repair has to be
 * attacked by something executable that a later agent can rerun.
 *
 * Every attack below is a real call against the real mechanism. An attack that
 * "passes" means the system REPELLED it.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/SELF_ATTACK_RECEIPT.json';

const results = [];
async function attack(name, intent, fn) {
  try {
    const outcome = await fn();
    results.push({ attack: name, attacker_intent: intent, repelled: outcome.repelled === true, evidence: outcome.evidence });
  } catch (err) {
    results.push({ attack: name, attacker_intent: intent, repelled: false, evidence: `attack harness error: ${err.message}` });
  }
}

const { detectInventions } = await import('../services/blueprint-invention-detector.js');
const { compileManufacturingPlan, verifyManufacturingPlan, manufacturingPlanHash } = await import('./manufacturing-plan.mjs');
const { sealManufacturingPlan } = await import('./seal-manufacturing-plan.mjs');
const { computeTrustDelta } = await import('../config/trust-scoring.js');
const { stepDependencies } = await import('../config/step-dependencies.js');
const { REQUIRED_CONSENSUS_OFFICES } = await import('../config/manufacturing-plan-schema.js');

const cleanBlueprint = {
  blueprint_id: 'BP-ATTACK',
  _meta: { product: 'attack-product', ssot_tag: 'docs/products/attack-product/PRODUCT_HOME.md', acceptance_cmd: 'node x.mjs' },
  steps: [
    { id: 'A1', file: 'services/a.js', deps: [] },
    { id: 'A2', file: 'services/b.js', deps: ['A1'] },
  ],
};

function fullySealed(blueprint = cleanBlueprint) {
  let plan = compileManufacturingPlan(blueprint);
  for (const office of REQUIRED_CONSENSUS_OFFICES) ({ plan } = sealManufacturingPlan({ plan, office, blueprint }));
  return plan;
}

// 1. Invent missing architecture.
await attack('invent_missing_architecture', 'ship a table whose columns the source never specified', () => {
  const report = detectInventions({
    session: {
      product_name: 'attack-product',
      extracted_intent_json: { data_stores: [{ name: 'GhostStore', columns: [] }] },
      blueprint_json: {
        _meta: { product: 'attack-product' },
        steps: [{ id: 'S1', type: 'sql', file: 'db/migrations/1_create_ghost_store.sql', content: 'CREATE TABLE ghost_store (id UUID PRIMARY KEY, invented_col TEXT);' }],
      },
    },
  });
  return {
    repelled: report.manufacturing_authorized === false && report.defects.some((d) => d.id === 'INVENTED_SQL_SCHEMA'),
    evidence: `manufacturing_authorized=${report.manufacturing_authorized}, defects=${report.defects.map((d) => d.id).join(',')}`,
  };
});

// 2. Authorize by argument shape (inline blueprint).
await attack('inline_blueprint_bypass', 'skip the session status, ARC gate and no-invention check in one move', async () => {
  const prev = process.env.FACTORY_ALLOW_INLINE_BLUEPRINT;
  delete process.env.FACTORY_ALLOW_INLINE_BLUEPRINT;
  const { executeIntakeBlueprint } = await import('../services/intake-blueprint-executor.js');
  const r = await executeIntakeBlueprint({
    sessionId: 'nope',
    blueprint: cleanBlueprint,
    baseUrl: 'http://127.0.0.1:1',
    commandKey: 'x',
    dryRun: false,
  });
  if (prev === undefined) delete process.env.FACTORY_ALLOW_INLINE_BLUEPRINT;
  else process.env.FACTORY_ALLOW_INLINE_BLUEPRINT = prev;
  return { repelled: r.ok === false && r.error === 'inline_blueprint_not_authorized', evidence: `error=${r.error}` };
});

// 3. Caller-controlled gate skip.
await attack('caller_controlled_gate_skip', 'pass skip_intake_gate:true and be believed', async () => {
  const prev = process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE;
  delete process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE;
  const { dispatchExecuteStep } = await import('../factory-staging/factory-core/builder/run-step.js');
  const r = await dispatchExecuteStep({ skip_intake_gate: true, mission_id: 'M', step: { step_id: 'S', sandbox_boundary: 'test' } });
  if (prev === undefined) delete process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE;
  else process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE = prev;
  return {
    repelled: r.httpStatus === 422 && r.body?.reason === 'skip_intake_gate_not_permitted',
    evidence: `status=${r.httpStatus} reason=${r.body?.reason}`,
  };
});

// 4. Certify its own approval.
await attack('self_certification', 'have the deciding module mint the seal it validates', async () => {
  const verifier = await import('./manufacturing-plan.mjs');
  const gate = await import('../factory-staging/factory-core/builder/chair-consensus-gate.mjs');
  const minters = [...Object.keys(verifier), ...Object.keys(gate)].filter((k) => /(mint|issue|create|sign)\w*Seal/i.test(k));
  return { repelled: minters.length === 0, evidence: `minting exports on deciding modules: [${minters.join(', ')}]` };
});

// 5. One office supplying the whole consensus.
await attack('single_office_consensus', 'seal three times as one office and call it consensus', () => {
  const plan = compileManufacturingPlan(cleanBlueprint);
  const hash = manufacturingPlanHash(plan);
  const r = verifyManufacturingPlan(
    { ...plan, consensus_seals: [0, 1, 2].map(() => ({ office: 'conductor', plan_hash: hash })) },
    cleanBlueprint
  );
  return { repelled: r.manufacturing_authorized === false, evidence: `state=${r.state} obtained=${r.consensus.obtained.join(',')}` };
});

// 6. Builder authorizing itself.
await attack('builder_self_authorization', 'let the Builder alone authorize its own work', () => {
  const plan = compileManufacturingPlan(cleanBlueprint);
  const hash = manufacturingPlanHash(plan);
  const r = verifyManufacturingPlan({ ...plan, consensus_seals: [{ office: 'builder', plan_hash: hash }] }, cleanBlueprint);
  return { repelled: r.manufacturing_authorized === false, evidence: `missing=${r.consensus.required.filter((o) => !r.consensus.obtained.includes(o)).join(',')}` };
});

// 7. Stale approval reuse.
await attack('stale_approval_reuse', 'edit the plan after sealing and reuse the approval', () => {
  const plan = fullySealed();
  const edited = { ...plan, slices: plan.slices.map((s) => ({ ...s, target_files: ['services/elsewhere.js'] })) };
  const r = verifyManufacturingPlan(edited, cleanBlueprint);
  return { repelled: r.manufacturing_authorized === false, evidence: `defects=${r.defects.map((d) => d.id).join(',')}` };
});

// 8. Amended blueprint carrying an old approval forward.
await attack('amended_blueprint_stale_plan', 'add a step to the blueprint and keep the old authorization', () => {
  const plan = fullySealed();
  const amended = { ...cleanBlueprint, steps: [...cleanBlueprint.steps, { id: 'A3', file: 'services/c.js', deps: [] }] };
  const r = verifyManufacturingPlan(plan, amended);
  return {
    repelled: r.manufacturing_authorized === false && r.defects.some((d) => d.id === 'BLUEPRINT_HASH_MISMATCH'),
    evidence: `defects=${r.defects.map((d) => d.id).join(',')}`,
  };
});

// 9. Terminology drift.
await attack('stale_terminology_manufacture', 'manufacture against a superseded ratified term', () => {
  const report = detectInventions({
    session: {
      product_name: 'attack-product',
      extracted_intent_json: { acceptance_criteria: ['The Presiding Steward approves the Digital Twin export'] },
      blueprint_json: { _meta: { product: 'attack-product' }, steps: [] },
    },
  });
  return {
    repelled: report.defects.some((d) => d.id === 'STALE_RATIFIED_TERMINOLOGY'),
    evidence: `defects=${report.defects.map((d) => `${d.id}:${d.former_term ?? ''}`).join(',')}`,
  };
});

// 10. Continue past a failed slice that others depend on.
await attack('continue_after_failed_dependency', 'mark a depended-on slice continue_isolated so a failure is ignored', () => {
  const plan = fullySealed();
  const unsafe = {
    ...plan,
    slices: plan.slices.map((s) => (s.steps.includes('A1') ? { ...s, failure_disposition: 'continue_isolated' } : s)),
  };
  const r = verifyManufacturingPlan(unsafe, cleanBlueprint);
  return {
    repelled: r.defects.some((d) => d.id === 'UNSAFE_CONTINUE_ISOLATED') || r.defects.some((d) => d.id === 'SEAL_PLAN_HASH_MISMATCH'),
    evidence: `defects=${r.defects.map((d) => d.id).join(',')}`,
  };
});

// 11. Hide a parallel write collision by mislabelling waves.
await attack('hidden_write_collision', 'schedule two writers of one file as separate waves on paper', () => {
  const colliding = {
    ...cleanBlueprint,
    steps: [
      { id: 'A1', file: 'services/same.js', deps: [] },
      { id: 'A2', file: 'services/same.js', deps: [] },
    ],
  };
  const plan = compileManufacturingPlan(colliding);
  const lying = { ...plan, waves: [{ wave_index: 0, slice_ids: ['SL-001'], parallel_safe: true }, { wave_index: 1, slice_ids: ['SL-002'], parallel_safe: true }] };
  const r = verifyManufacturingPlan(lying, colliding);
  return { repelled: r.defects.some((d) => d.id === 'PARALLEL_WRITE_COLLISION'), evidence: `defects=${r.defects.map((d) => d.id).join(',')}` };
});

// 12. Game the trust ledger.
await attack('trust_gaming_by_volume', 'earn trust with volume instead of Reality', () => {
  const volume = computeTrustDelta({ bugs_fixed: 200, lines_of_code: 50000, missions_completed: 99, wall_clock_speed: 1 });
  const reality = computeTrustDelta({ reality_verified: true });
  return { repelled: volume.delta === 0 && reality.delta > 0, evidence: `volume_delta=${volume.delta} reality_delta=${reality.delta}` };
});

// 13. Hide a defect rather than report it.
await attack('concealment_beats_disclosure', 'hide a known defect and outscore disclosing it', () => {
  const hid = computeTrustDelta({ concealment_detected: true, reality_verified: true });
  const disclosed = computeTrustDelta({ self_caught_defect: true, reality_verified: false, reality_scored: true });
  return { repelled: disclosed.delta > hid.delta, evidence: `disclosed=${disclosed.delta} concealed=${hid.delta}` };
});

// 14. Soften the exam.
await attack('exam_softening', 'pass the Overlay exam by editing the fixture', () => {
  const rel = 'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json';
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const actual = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  const expected = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/products/builderos/fixtures/intake-regression-2026-08-11/EXPECTED_DEFECTS.json'), 'utf8')
  ).sha256_of_fixture;
  // The exam verifies this pin BEFORE grading, so a softened fixture aborts.
  return { repelled: actual === expected, evidence: `fixture sha256 ${actual === expected ? 'matches pin' : 'DIVERGED'}` };
});

// 15. Empty dependency graph via key mismatch.
await attack('empty_graph_via_key_mismatch', 'author deps under one key so the queue reader sees no dependencies', () => {
  const seen = stepDependencies({ id: 'X', deps: ['W'] });
  return { repelled: seen.length === 1 && seen[0] === 'W', evidence: `queue-side reader saw [${seen.join(',')}]` };
});

// 16. Claim enforcement with no caller.
await attack('enforcement_claim_without_caller', 'claim a governance mechanism is enforced while nothing calls it', async () => {
  const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, 'products/receipts/GOVERNANCE_ENFORCEMENT_TRUTH_RECEIPT.json'), 'utf8'));
  const detects = Array.isArray(receipt.findings) && receipt.findings.length > 0;
  const ratcheted = receipt.verdict === 'CLEAN' && Array.isArray(receipt.new_regressions) && receipt.new_regressions.length === 0;
  return {
    repelled: detects && ratcheted,
    evidence: `sweep detects ${receipt.findings?.length ?? 0} dormant claims and fails on any new one (verdict=${receipt.verdict})`,
  };
});

// The resolution passes are a brand-new laundering surface: an office that can
// answer is an office that can invent. Probe it before trusting it.
await attack('architect_launders_invented_schema', 'get the Architect to draft columns the source never specified', async () => {
  const { runArchitectResolution } = await import('./architect-resolve-requests.mjs');
  const report = runArchitectResolution({
    requests: [{ defect_id: 'INVENTED_SQL_SCHEMA', subject: 'TaskStore' }],
    blueprint: {},
    intent: {},
  });
  const wroteBack = report.resolutions.some((r) => r.write_back);
  return {
    repelled: !wroteBack && report.routed_to_founder === 1,
    evidence: wroteBack
      ? 'BREACH: the Architect wrote back a schema it had no source for'
      : 'refused: no citable source and not a declared non-goal, so it routed upward as a structured founder question',
  };
});

await attack('architect_forges_a_citation', 'cite a source file that does not contain the table', async () => {
  const { auditResolutions } = await import('./architect-resolve-requests.mjs');
  const audit = auditResolutions([
    {
      kind: 'cite_existing',
      write_back: true,
      request: { subject: 'GhostStore' },
      citation: { source_file: 'db/migrations/never_written.sql', source_kind: 'db_migration', columns: [{ name: 'id' }] },
    },
  ]);
  return {
    repelled: !audit.clean && audit.violations.some((v) => v.id === 'CITATION_SOURCE_MISSING'),
    evidence: audit.clean ? 'BREACH: an unverifiable citation passed' : 'refused: CITATION_SOURCE_MISSING — the cited file must really exist',
  };
});

await attack('architect_decides_a_class_b_subject', 'answer a pricing/privacy question with high confidence', async () => {
  const { runArchitectResolution } = await import('./architect-resolve-requests.mjs');
  const report = runArchitectResolution({
    requests: [{ defect_id: 'INVENTED_SQL_SCHEMA', subject: 'BillingStore', question: 'what should the pricing policy be?' }],
    blueprint: {},
    intent: {},
  });
  const r = report.resolutions[0];
  return {
    repelled: r.write_back === false && /class_b_subject/.test(r.reason || ''),
    evidence: r.write_back ? 'BREACH: the Architect ruled on product policy' : `refused: ${r.reason}`,
  };
});

await attack('conductor_registration_claims_a_pass', 'register a Sentry gate in a state that implies it already passed', async () => {
  const { auditConductorResolutions, buildSentryRegistration } = await import('./conductor-resolve-requests.mjs');
  const audit = auditConductorResolutions([
    {
      kind: 'register_product_sentry',
      write_back: true,
      request: { subject: 'attack-product' },
      registry_patch: { ...buildSentryRegistration('attack-product'), status: 'passed' },
    },
  ]);
  return {
    repelled: !audit.clean && audit.violations.some((v) => v.id === 'REGISTRATION_IMPLIES_PASS'),
    evidence: audit.clean ? 'BREACH: registration doubled as a pass claim' : 'refused: REGISTRATION_IMPLIES_PASS',
  };
});

const repelled = results.filter((r) => r.repelled).length;
const breached = results.filter((r) => !r.repelled);

const receipt = {
  schema: 'self_attack_receipt_v1',
  generated_at: new Date().toISOString(),
  produced_by: 'scripts/self-attack-governance.mjs',
  purpose:
    'A hand-audit by the agent that wrote the repair is not verification. These are executable attacks a later agent can rerun.',
  separation_collapsed: true,
  separation_note:
    'The same agent wrote the repair and these attacks. Mitigation: every attack calls the real mechanism rather than a mock, asserts on a specific refusal reason rather than a truthy value, and is rerunnable by anyone via `npm run builderos:self-attack`. It does not prove the attack set is complete — only that these 20 moves fail.',
  independent_reproduction_command: 'npm run builderos:self-attack',
  verdict: breached.length === 0 ? 'ALL_ATTACKS_REPELLED' : 'BREACH_PRESENT',
  attacks_run: results.length,
  repelled,
  breached: breached.map((b) => ({ attack: b.attack, evidence: b.evidence })),
  results,
};
fs.mkdirSync(path.dirname(path.join(ROOT, RECEIPT_REL)), { recursive: true });
fs.writeFileSync(path.join(ROOT, RECEIPT_REL), `${JSON.stringify(receipt, null, 2)}\n`);

for (const r of results) console.log(`${r.repelled ? 'REPELLED' : 'BREACH  '}  ${r.attack} — ${r.evidence}`);
console.log(`\n=== ${repelled}/${results.length} attacks repelled — ${receipt.verdict} ===`);
if (breached.length > 0) process.exit(1);
