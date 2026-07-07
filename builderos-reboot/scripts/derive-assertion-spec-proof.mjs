/**
 * SYNOPSIS: STEP 5d proof — the Century/SENTRY hardening of BPB spec extraction
 * the Chair required before any fence flip (receipt LIFERE_COUNCIL_1783453514819).
 * Proves the derivation is NON-FABRICATING: mission overrides win; exact_content /
 * exact_inputs.content_source_path yield provable assertions from real symbols;
 * non-server-code needs no proof; and a builder_build step with no declaration or
 * a missing byte-exact source is reported as a coverage GAP (never invented).
 */
import {
  extractExportedSymbols,
  deriveAssertionSpecFromBlueprintStep,
  auditBlueprintCoverage,
} from '../../factory-staging/factory-core/bpb/derive-assertion-spec.js';

const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond) });
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : JSON.stringify(detail));
};

// extractExportedSymbols — const/function/class + export{ a as b }
const syms = extractExportedSymbols(`
export const alpha = 1;
export async function beta() {}
export class Gamma {}
const q = 2; export { q as delta };
`);
assert('extracts const/function/class/renamed exports', ['alpha', 'beta', 'Gamma', 'delta'].every((s) => syms.includes(s)), { syms });

// declared override wins
const decl = deriveAssertionSpecFromBlueprintStep({ step_id: 'd', target_file: 'services/x.js', assertion_spec: { expected_exports: ['foo'] } });
assert('mission assertion_spec override => declared', decl.coverage === 'declared' && decl.assertion_spec.expected_exports[0] === 'foo', { decl });

// derived from inline exact_content
const de = deriveAssertionSpecFromBlueprintStep({ step_id: 'e', target_file: 'services/y.js', action_type: 'write_file_exact', exact_content: 'export const wired = true;\n' });
assert('exact_content => derived_exact with symbol', de.coverage === 'derived_exact' && de.assertion_spec.expected_exports.includes('wired'), { de });

// derived from exact_inputs.content_source_path (byte-exact copy) — real schema
const dsStep = { step_id: 's', target_file: 'routes/z.js', action_type: 'write_file_exact', exact_inputs: { content_source_path: 'CONTENT/z.js' }, exact_output_contract: { sha256: 'x' } };
const ds = deriveAssertionSpecFromBlueprintStep(dsStep, { sourceContent: 'export function handler() {}\n' });
assert('exact_inputs source => derived_source with symbol', ds.coverage === 'derived_source' && ds.assertion_spec.expected_exports.includes('handler'), { ds });

// non-server-code => not_required
const nr = deriveAssertionSpecFromBlueprintStep({ step_id: 'n', target_file: 'docs/thing.md', action_type: 'builder_build' });
assert('non-server-code => not_required', nr.coverage === 'not_required');

// builder_build server-code, no declaration => gap (NOT fabricated)
const gap = deriveAssertionSpecFromBlueprintStep({ step_id: 'g', target_file: 'services/mystery.js', action_type: 'builder_build' });
assert('builder_build no declaration => gap, no invented assertion', gap.coverage === 'gap' && gap.assertion_spec === null, { gap });

// audit distinguishes source_missing from no_declaration
const audit = auditBlueprintCoverage(
  {
    mission_id: 'M',
    steps: [
      { step_id: 'a', target_file: 'services/a.js', action_type: 'write_file_exact', exact_inputs: { content_source_path: 'CONTENT/missing.js' } },
      { step_id: 'b', target_file: 'services/b.js', action_type: 'builder_build' },
      { step_id: 'c', target_file: 'services/c.js', action_type: 'write_file_exact', exact_content: 'export const c = 1;\n' },
    ],
  },
  () => null, // all sources unreadable
);
assert('audit counts provable + gaps', audit.total === 3 && audit.provable === 1 && audit.gaps === 2, { audit });
assert('audit labels source_missing vs no_declaration',
  audit.gap_steps.find((g) => g.step_id === 'a')?.gap_kind === 'source_missing'
  && audit.gap_steps.find((g) => g.step_id === 'b')?.gap_kind === 'no_declaration', { gap_steps: audit.gap_steps });

const failed = results.filter((r) => !r.pass);
console.log(`\nDERIVE-ASSERTION-SPEC-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
