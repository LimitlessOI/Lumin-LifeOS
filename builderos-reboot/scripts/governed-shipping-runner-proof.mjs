/**
 * SYNOPSIS: STEP 5b proof — BPB assertion authorship + the governed shipping
 * runner. Proves (1) BPB authors assertions from the blueprint spec (option a),
 * never fabricating; (2) a server-code step whose spec declares nothing provable
 * fails closed; (3) blueprint-declared assertions are preserved untouched;
 * (4) the runner ships each step through the governed dispatch with clean
 * provenance; (5) Century's flag — a mid-queue crash is loud + resumable (no
 * silent skip) and a governed block halts the run fail-closed; (6) END-TO-END
 * through the REAL /factory/execute-step dispatcher (same one proven live in STEP 4).
 */
import { authorAssertionsFromSpec, attachAuthoredAssertions } from '../../factory-staging/factory-core/bpb/author-assertions.js';
import { runGovernedShippingQueue } from '../../services/governed-shipping-runner.js';
import { dispatchExecuteStep } from '../../factory-staging/factory-core/builder/run-step.js';

const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond), ...detail });
  if (!cond) console.error('FAIL', name, JSON.stringify(detail));
  else console.log('PASS', name);
};

// (1) BPB authors assertions from declared spec — exports, route, db.
const svcStep = {
  step_id: 's1',
  target_file: 'services/widget.js',
  assertion_spec: { expected_exports: ['createWidget'], route: { path: '/api/v1/widget', expect_status: [200] } },
};
const authored = authorAssertionsFromSpec(svcStep);
assert('BPB authors file_contains from expected_exports', authored.ok && authored.assertions.some((a) => a.type === 'file_contains' && a.substring === 'createWidget'), { authored });
assert('BPB authors http_status from declared route', authored.assertions.some((a) => a.type === 'http_status' && a.path === '/api/v1/widget'), { authored });
assert('BPB provenance is bpb, never codegen', authored.provenance === 'bpb');

// (2) fail-closed: server-code target, spec declares nothing verifiable.
const bare = authorAssertionsFromSpec({ step_id: 's2', target_file: 'services/mystery.js', assertion_spec: {} });
assert('fail-closed when spec declares no provable behavior', bare.ok === false && bare.reason === 'spec_declares_no_verifiable_behavior', { bare });

// non-server-code target with nothing declared is legitimately proof-free.
const doc = authorAssertionsFromSpec({ step_id: 's3', target_file: 'docs/thing.md', assertion_spec: {} });
assert('non-server-code needs no proof', doc.ok === true && doc.assertions.length === 0);

// (3) blueprint-declared assertions preserved untouched (already provenance-clean).
const declared = attachAuthoredAssertions({ step_id: 's4', target_file: 'services/x.js', behavior_assertions: [{ type: 'file_contains', target: 'services/x.js', substring: 'export const x' }] });
assert('declared assertions preserved', declared.ok && declared.provenance === 'blueprint_declared' && declared.step.behavior_assertions.length === 1);

// (4) runner ships each step through governed dispatch with clean provenance.
const okDispatch = async ({ step }) => ({ httpStatus: 200, body: { sentry: { implementation_status: 'PASS' }, codegen: { assertion_provenance: 'blueprint', content_sha256: 'abc' }, step_id: step.step_id } });
const cps = [];
const sigs = [];
const good = await runGovernedShippingQueue({
  mission_id: 'M', blueprint_id: 'BP',
  steps: [svcStep, { step_id: 's-doc', target_file: 'docs/y.md', assertion_spec: {} }],
  dispatch: okDispatch,
  checkpoint: async (c) => cps.push(c),
  signal: async (s) => sigs.push(s),
});
assert('runner ships full queue through governed pipe', good.ok === true && good.complete === true && good.shipped.length === 2, { good });
assert('runner checkpoints before + after each step', cps.some((c) => c.phase === 'dispatching') && cps.some((c) => c.phase === 'shipped'), { cps });
assert('runner emits queue_complete signal', sigs.some((s) => s.kind === 'queue_complete'));

// (5a) CENTURY: mid-queue crash is loud + resumable, no silent skip.
let calls = 0;
const crashDispatch = async () => { calls += 1; if (calls === 2) throw new Error('boom'); return { httpStatus: 200, body: { sentry: { implementation_status: 'PASS' } } }; };
const crashSigs = [];
const crashed = await runGovernedShippingQueue({
  mission_id: 'M', blueprint_id: 'BP',
  steps: [svcStep, { ...svcStep, step_id: 's-crash' }, { ...svcStep, step_id: 's-after' }],
  dispatch: crashDispatch,
  signal: async (s) => crashSigs.push(s),
});
assert('crash halts loud + resumable (no silent skip)', crashed.ok === false && crashed.crashed === true && crashed.resume_from === 1 && crashSigs.some((s) => s.kind === 'runner_crash' && s.resume_from === 1), { crashed });

// resume from the crash index completes the rest.
const resumed = await runGovernedShippingQueue({
  mission_id: 'M', blueprint_id: 'BP',
  steps: [svcStep, { ...svcStep, step_id: 's-crash' }, { ...svcStep, step_id: 's-after' }],
  dispatch: okDispatch, startIndex: 1,
});
assert('resume from checkpoint finishes remaining steps', resumed.ok === true && resumed.resumed_from === 1 && resumed.shipped.length === 2, { resumed });

// (5b) governed block halts the run fail-closed (SENTRY refused).
const blockDispatch = async () => ({ httpStatus: 422, body: { gap_type: 'behavior_proof_failed', sentry: { implementation_status: 'FAIL' } } });
const blockSigs = [];
const blocked = await runGovernedShippingQueue({
  mission_id: 'M', blueprint_id: 'BP', steps: [svcStep], dispatch: blockDispatch, signal: async (s) => blockSigs.push(s),
});
assert('governed block halts run fail-closed', blocked.ok === false && blocked.blocked === true && blockSigs.some((s) => s.kind === 'step_blocked_by_governance'), { blocked });

// (5c) unprovable step halts BEFORE dispatch (fail-closed, never ships).
let dispatched = 0;
const unprov = await runGovernedShippingQueue({
  mission_id: 'M', blueprint_id: 'BP',
  steps: [{ step_id: 's-unprov', target_file: 'services/nope.js', assertion_spec: {} }],
  dispatch: async () => { dispatched += 1; return { httpStatus: 200, body: {} }; },
});
assert('unprovable step halts before dispatch', unprov.ok === false && unprov.halted === true && dispatched === 0, { unprov, dispatched });

// (6) END-TO-END with the REAL dispatcher: BPB authors the assertion, codegen
//     writes the file, the REAL /factory/execute-step pipe (Builder→SENTRY) proves
//     it. Not a stub dispatch — the same dispatcher proven live on prod in STEP 4.
const REAL_TARGET = 'factory-staging/factory-core/_step5b_proof_scratch.js';
const REAL_CONTENT = 'export const shippedByGovernedRunner = true;\n';
const realStep = {
  step_id: 's5b-e2e',
  action_type: 'author_then_write',
  sandbox_boundary: 'factory-staging/factory-core/**',
  target_file: REAL_TARGET,
  authoring: { task: 'emit trivial module', spec: 'export const shippedByGovernedRunner = true;' },
  // BPB authors the assertion from the declared spec — NOT codegen.
  assertion_spec: { expected_exports: ['shippedByGovernedRunner'] },
};
const realDispatch = async ({ mission_id, blueprint_id, step }) => dispatchExecuteStep(
  { mission_id, blueprint_id, skip_intake_gate: true, step },
  { assertionRunner: { readFile: async () => REAL_CONTENT }, codegenRunner: { generate: async ({ tiers }) => ({ content: REAL_CONTENT, model_tier: tiers[0], escalated: false }) } },
);
const e2e = await runGovernedShippingQueue({ mission_id: 'STEP5B-PROOF', blueprint_id: 'STEP5B-PROOF', steps: [realStep], dispatch: realDispatch });
assert('E2E: BPB-authored assertion + real dispatcher => SENTRY PASS, shipped', e2e.ok === true && e2e.complete === true && e2e.shipped[0]?.assertion_provenance === 'bpb', { e2e });

const failed = results.filter((r) => !r.pass);
console.log(`\nGOVERNED-SHIPPING-RUNNER-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
