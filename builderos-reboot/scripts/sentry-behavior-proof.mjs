/**
 * SYNOPSIS: STEP 3 proof — SENTRY behavioral proof gate. Proves (1) a server-code
 * step with NO behavior_assertions fails closed, (2) a passing assertion via an
 * injected stub runner yields PASS with verbatim results, (3) a failing assertion
 * yields FAIL. Read-only stub runner; no prod DB/HTTP.
 */
import { stepRequiresBehaviorProof, evaluateBehaviorGate, runBehaviorAssertions } from '../../factory-staging/factory-core/sentry/behavior-assertions.js';

const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond), ...detail });
  if (!cond) console.error('FAIL', name, JSON.stringify(detail));
  else console.log('PASS', name);
};

// (1) classification: server-code target requires proof
const serverStep = { step_id: 'S1', target_file: 'routes/foo-routes.js' };
assert('server-code step requires behavior proof', stepRequiresBehaviorProof(serverStep) === true);

// pure config/doc file is exempt
assert('markdown file is exempt', stepRequiresBehaviorProof({ step_id: 'S2', target_file: 'docs/x.md' }) === false);

// (2) FAIL-CLOSED: required but NO assertions declared
const closedGate = evaluateBehaviorGate(serverStep, { runnerAvailable: true, results: [] });
assert('fail-closed when required proof missing', closedGate.pass === false && closedGate.findings.includes('missing_behavior_proof'), { findings: closedGate.findings });

// FAIL-CLOSED: assertions declared but no runner injected
const stepWithAssert = {
  step_id: 'S3', target_file: 'routes/foo-routes.js',
  behavior_assertions: [{ type: 'db_row_exists', sql: 'SELECT 1 FROM prospect_sites LIMIT 1', expect_min_rows: 1 }],
};
const noRunnerGate = evaluateBehaviorGate(stepWithAssert, { runnerAvailable: false, results: [] });
assert('fail-closed when runner unavailable', noRunnerGate.pass === false && noRunnerGate.findings.includes('behavior_runner_unavailable'));

// (3) PASS via injected stub runner (read-only SELECT)
const stubPass = { db: async (sql) => (/select/i.test(sql) ? [{ n: 1 }, { n: 2 }] : []) };
const passResults = await runBehaviorAssertions(stepWithAssert.behavior_assertions, stubPass);
const passGate = evaluateBehaviorGate(stepWithAssert, { runnerAvailable: true, results: passResults });
assert('pass when assertion satisfied', passGate.pass === true, { results: passResults });
assert('verbatim result carries observed_rows', passResults[0]?.observed_rows === 2 && Array.isArray(passResults[0]?.rows_sample), { first: passResults[0] });

// (4) FAIL when assertion returns too few rows
const stubFail = { db: async () => [] };
const failResults = await runBehaviorAssertions(stepWithAssert.behavior_assertions, stubFail);
const failGate = evaluateBehaviorGate(stepWithAssert, { runnerAvailable: true, results: failResults });
assert('fail when assertion unsatisfied', failGate.pass === false && failGate.findings.includes('behavior_assertion_failed'), { results: failResults });

// (5) reject a non-read-only SQL (write attempt)
const writeStep = { behavior_assertions: [{ type: 'db_row_exists', sql: 'DELETE FROM prospect_sites' }] };
const writeResults = await runBehaviorAssertions(writeStep.behavior_assertions, stubPass);
assert('reject non-read-only SQL', writeResults[0]?.ok === false && writeResults[0]?.reason === 'sql_must_be_read_only_select', { first: writeResults[0] });

const failed = results.filter((r) => !r.pass);
console.log(`\nBEHAVIOR-PROOF: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
