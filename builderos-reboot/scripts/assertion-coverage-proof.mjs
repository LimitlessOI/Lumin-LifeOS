#!/usr/bin/env node
/**
 * SYNOPSIS: Offline proof for the assertion-COVERAGE increment (north-star:
 * blueprint -> completed project autonomously). Proves the governed prover can
 * now classify MORE step shapes as provable WITHOUT fabricating a success
 * criterion: it recognises an explicitly-declared expectation (expected_exports
 * / route / file_contains) and an explicit STRUCTURED acceptance block, while a
 * server-code step that declares nothing checkable still fails closed as a gap.
 *
 * No network, no codegen spend. Chair design lock: LIFERE_COUNCIL_1783466246240.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import {
  deriveAssertionSpecFromBlueprintStep,
  auditBlueprintCoverage,
} from '../../factory-staging/factory-core/bpb/derive-assertion-spec.js';
import {
  assertionSpecFromBuildQueueStep,
  assessBuildQueueStepProvability,
  parseRouteDeclaration,
} from '../../factory-staging/factory-core/bpb/build-queue-step-adapter.js';

let passed = 0;
let failed = 0;
function assert(name, cond, detail = '') {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n=== assertion-coverage proof ===\n');

// 1) explicit "METHOD /path" route parses; bare "/path" parses; prose does NOT.
const r1 = parseRouteDeclaration('POST /api/v1/widgets');
assert('parseRouteDeclaration extracts METHOD + path', r1 && r1.method === 'POST' && r1.path === '/api/v1/widgets', JSON.stringify(r1));
const r2 = parseRouteDeclaration('/api/v1/health');
assert('parseRouteDeclaration extracts bare path', r2 && r2.path === '/api/v1/health' && !r2.method, JSON.stringify(r2));
assert('parseRouteDeclaration REFUSES freeform prose (no fabrication)', parseRouteDeclaration('mount a widgets endpoint somewhere') === null);
assert('parseRouteDeclaration passes through a declared object', parseRouteDeclaration({ path: '/x', method: 'GET' })?.path === '/x');

// 2) step-level declared expected_exports -> declared_intent, provable.
const stepExports = { step_id: 's-exports', target_file: 'services/widget-scorer.js', action_type: 'author_then_write', expected_exports: ['scoreWidget', 'rankWidgets'] };
const dExports = deriveAssertionSpecFromBlueprintStep(stepExports);
assert('declared expected_exports -> coverage declared_intent', dExports.coverage === 'declared_intent', dExports.coverage);
assert('declared expected_exports -> assertion_spec carries the names', JSON.stringify(dExports.assertion_spec?.expected_exports) === JSON.stringify(['scoreWidget', 'rankWidgets']));
assert('adapter agrees the exports step is provable', assessBuildQueueStepProvability({ id: 's-exports', target_file: 'services/widget-scorer.js', expected_exports: ['scoreWidget'] }).provable === true);

// 3) explicit structured acceptance.route (string) -> derived_intent, provable.
const stepAcceptRoute = { step_id: 's-route', target_file: 'routes/widget-routes.js', action_type: 'author_then_write', acceptance: { route: 'GET /api/v1/widgets' } };
const dRoute = deriveAssertionSpecFromBlueprintStep(stepAcceptRoute);
assert('acceptance.route string -> coverage derived_intent', dRoute.coverage === 'derived_intent', dRoute.coverage);
assert('acceptance.route string -> parsed route in assertion_spec', dRoute.assertion_spec?.route?.path === '/api/v1/widgets' && dRoute.assertion_spec?.route?.method === 'GET', JSON.stringify(dRoute.assertion_spec));
assert('adapter reads acceptance block for provability', assessBuildQueueStepProvability({ id: 's-route', target_file: 'routes/widget-routes.js', acceptance: { route: 'GET /api/v1/widgets' } }).provable === true);

// 4) acceptance.expected_exports -> derived_intent.
const stepAcceptExports = { step_id: 's-acc-exports', target_file: 'services/x.js', acceptance: { expected_exports: ['doThing'] } };
assert('acceptance.expected_exports -> derived_intent', deriveAssertionSpecFromBlueprintStep(stepAcceptExports).coverage === 'derived_intent');

// 5) mission-authored assertion_spec still wins as 'declared'.
const stepDeclared = { step_id: 's-decl', target_file: 'services/y.js', assertion_spec: { expected_exports: ['z'] } };
assert('explicit assertion_spec -> coverage declared', deriveAssertionSpecFromBlueprintStep(stepDeclared).coverage === 'declared');

// 6) FAIL-CLOSED: server-code step with only prose task and no declaration = gap.
const stepProse = { step_id: 's-gap', target_file: 'services/mystery.js', action_type: 'author_then_write', task: 'build a mystery service that does important things' };
const dGap = deriveAssertionSpecFromBlueprintStep(stepProse);
assert('prose-only server-code step stays a GAP (fail-closed)', dGap.coverage === 'gap', dGap.coverage);
assert('gap carries a reason, never an invented assertion', dGap.assertion_spec === null && typeof dGap.reason === 'string');
assert('adapter also refuses the prose-only step', assessBuildQueueStepProvability({ id: 's-gap', target_file: 'services/mystery.js', task: 'do stuff' }).provable === false);

// 7) non-server-code target with no declaration = not_required (still provable).
const stepDoc = { step_id: 's-doc', target_file: 'docs/products/x/NOTES.md', task: 'write notes' };
assert('non-server-code target -> not_required', deriveAssertionSpecFromBlueprintStep(stepDoc).coverage === 'not_required');

// 8) whole-blueprint audit: declared_intent + derived_intent count as provable,
//    gaps still surfaced for a human/BPB.
const blueprint = {
  blueprint_id: 'BP-COVERAGE-PROOF',
  steps: [stepExports, stepAcceptRoute, stepDeclared, stepDoc, stepProse],
};
const audit = auditBlueprintCoverage(blueprint);
assert('audit counts new coverage kinds as provable', audit.provable === 4, `provable=${audit.provable} by=${JSON.stringify(audit.by_coverage)}`);
assert('audit still surfaces the 1 real gap', audit.gaps === 1 && audit.gap_steps.length === 1, JSON.stringify(audit.gap_steps));

// 9) assertionSpecFromBuildQueueStep prefers step-level over acceptance (no double-count).
const bothStep = { target_file: 'services/z.js', expected_exports: ['a'], acceptance: { expected_exports: ['b'] } };
assert('step-level expectation wins over acceptance fallback', JSON.stringify(assertionSpecFromBuildQueueStep(bothStep).expected_exports) === JSON.stringify(['a']));

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
process.exit(failed === 0 ? 0 : 1);
