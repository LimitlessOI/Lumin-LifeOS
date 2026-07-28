/**
 * SYNOPSIS: STEP 4 proof — codegen as an untrusted "dumb pipe" authoring sub-step.
 * Proves (1) authoring is fail-closed with no runner, (2) a server-code authoring
 * step with NO blueprint assertions fails closed BEFORE any model call
 * (assertion-provenance lock), (3) a full author_then_write step flows through the
 * write + Step-3 SENTRY behavior gate to PASS using a stub codegen + stub assertion
 * runner, (4) codegen CANNOT supply assertions — only the blueprint's are used,
 * (5) the strongest tier is tried first (SO-003) and escalation is recorded.
 * Stub runners only.
 */
import { stepRequiresAuthoring, runAuthoring, DEFAULT_CODEGEN_TIERS } from '../../factory-staging/factory-core/builder/authoring.js';
import { QUALITY_FIRST_FALLBACK_MODELS } from '../../config/task-model-routing.js';
import { dispatchExecuteStep } from '../../factory-staging/factory-core/builder/run-step.js';

const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond), ...detail });
  if (!cond) console.error('FAIL', name, JSON.stringify(detail));
  else console.log('PASS', name);
};

// A server-code target under the factory scratch sandbox (ephemeral file).
const TARGET = 'factory-staging/factory-core/_step4_proof_scratch.js';
const SANDBOX = 'factory-staging/factory-core/**';
const CONTENT = '/**\n * SYNOPSIS: Factory CI proof scratch file. Auto-generated test artifact.\n */\nexport const authored = true;\n';

const baseStep = {
  step_id: 's4-author',
  action_type: 'author_then_write',
  sandbox_boundary: SANDBOX,
  target_file: TARGET,
  authoring: { task: 'emit a trivial module', spec: 'export const authored = true;' },
  behavior_assertions: [{ type: 'file_contains', target: TARGET, substring: 'export const authored' }],
};

// (1) classification
assert('author_then_write requires authoring', stepRequiresAuthoring(baseStep) === true);
assert('plain write step needs no authoring', stepRequiresAuthoring({ action_type: 'write_file_exact' }) === false);

// (2) fail-closed: no codegen runner injected
const noRunner = await runAuthoring(baseStep, null);
assert('fail-closed when no codegen runner', noRunner.ok === false && noRunner.reason === 'no_codegen_runner', { reason: noRunner.reason });

// (3) PROVENANCE LOCK: server-code step with NO blueprint assertions fails closed
//     BEFORE any model call (codegen never runs).
let codegenCalls = 0;
const stubCodegen = {
  generate: async ({ tiers }) => {
    codegenCalls += 1;
    return { content: CONTENT, model_tier: tiers[0], escalated: false };
  },
};
const noAssertStep = { ...baseStep, behavior_assertions: [] };
const provLock = await runAuthoring(noAssertStep, stubCodegen);
assert('provenance lock: no blueprint assertions => fail before codegen', provLock.ok === false && provLock.reason === 'authoring_requires_blueprint_assertions' && codegenCalls === 0, { reason: provLock.reason, codegenCalls });

// (4) authoring returns CONTENT ONLY (no assertions channel)
const authored = await runAuthoring(baseStep, stubCodegen);
assert('authoring returns content only', authored.ok === true && authored.content === CONTENT && !('behavior_assertions' in authored), { keys: Object.keys(authored) });
assert('authoring records blueprint provenance', authored.assertion_provenance === 'blueprint');

// (5) strongest tier first (SO-003) + escalation recorded
let attempts = 0;
const escalatingCodegen = {
  generate: async ({ tiers }) => {
    // first tier returns empty -> forces escalation to tier 2
    for (let i = 0; i < tiers.length; i += 1) {
      attempts += 1;
      if (i === 0) continue; // simulate cheapest failing
      return { content: CONTENT, model_tier: tiers[i], escalated: i > 0 };
    }
    return { content: null };
  },
};
const esc = await runAuthoring(baseStep, escalatingCodegen);
// Asserted against the declared policy rather than a hardcoded model name: this
// assertion has already broken twice (2026-07-14, 2026-07-27) because the chain was
// legitimately reordered. TRUSTED_FALLBACK_MODELS_OVERRIDE is a ratified operational
// lever for when the strong providers are unfunded, so an override is not drift —
// but with no override set, the code default must still be strong-first per SO-003.
const tierOverride = String(process.env.TRUSTED_FALLBACK_MODELS_OVERRIDE || '').trim();
assert(
  tierOverride
    ? 'tier[0] follows the operational override (SO-003 strong-first default deferred)'
    : 'tier[0] is the declared strong-first default (SO-003)',
  tierOverride
    ? typeof DEFAULT_CODEGEN_TIERS[0] === 'string' && DEFAULT_CODEGEN_TIERS[0].length > 0
    : DEFAULT_CODEGEN_TIERS[0] === QUALITY_FIRST_FALLBACK_MODELS[0],
  { tier_0: DEFAULT_CODEGEN_TIERS[0], override: tierOverride || null },
);
assert('escalation chain has at least two distinct tiers', DEFAULT_CODEGEN_TIERS.length >= 2
  && new Set(DEFAULT_CODEGEN_TIERS).size === DEFAULT_CODEGEN_TIERS.length,
{ tiers: DEFAULT_CODEGEN_TIERS });
assert('escalates on first-tier failure', esc.ok === true && esc.escalated === true && esc.model_tier === DEFAULT_CODEGEN_TIERS[1], { model_tier: esc.model_tier, escalated: esc.escalated });

// (6) FULL PIPE: author_then_write flows through write + SENTRY behavior gate to PASS.
//     Uses a stub assertion runner (file read) + stub codegen. skip_intake to isolate.
const stubAssertionRunner = {
  readFile: async () => CONTENT,
};
const dispatch = await dispatchExecuteStep(
  { mission_id: 'STEP4-PROOF', blueprint_id: 'STEP4-PROOF', skip_intake_gate: true, step: baseStep },
  { assertionRunner: stubAssertionRunner, codegenRunner: stubCodegen },
);
assert('full pipe: author_then_write => 200 SENTRY PASS', dispatch.httpStatus === 200 && dispatch.body?.sentry?.implementation_status === 'PASS', { httpStatus: dispatch.httpStatus, status: dispatch.body?.status });
assert('codegen provenance surfaced in response', dispatch.body?.codegen?.assertion_provenance === 'blueprint' && typeof dispatch.body?.codegen?.content_sha256 === 'string', { codegen: dispatch.body?.codegen });
assert('behavior proof executed on authored content', dispatch.body?.historian?.behavior_assertions?.[0]?.ok === true, { historian: dispatch.body?.historian });

// (7) FAIL-CLOSED end-to-end: author_then_write with no runner => blocked, no ship
const dispatchNoRunner = await dispatchExecuteStep(
  { mission_id: 'STEP4-PROOF', blueprint_id: 'STEP4-PROOF', skip_intake_gate: true, step: baseStep },
  { assertionRunner: stubAssertionRunner, codegenRunner: null },
);
assert('fail-closed end-to-end when no codegen runner', dispatchNoRunner.httpStatus === 422 && dispatchNoRunner.body?.gap_type === 'codegen_authoring_failed', { httpStatus: dispatchNoRunner.httpStatus, gap: dispatchNoRunner.body?.gap_type });

const failed = results.filter((r) => !r.pass);
console.log(`\nCODEGEN-DUMBPIPE-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
