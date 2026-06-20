import assert from 'node:assert/strict';
import {
  detectGeneratedLayerViolation,
  detectScopeIncomplete,
  enforceExecutionTruth,
} from '../services/lifeos-execution-truth.js';

const BROKEN_ROUTE_SAMPLE = `const luminDrawer = document.getElementById('lumin-drawer');
window.luminBootThread = function() { loadLuminChatHistory(); };
`;

const COMMS_TASK = [
  'public/overlay/lifeos-dashboard.html: load history on DOMContentLoaded',
  'public/overlay/lifeos-app.html: luminBootThread extension',
  'routes/lifeos-builderos-command-control-routes.js: persist via recordExchange',
].join('\n');

function testRouteStubDetection() {
  const hit = detectGeneratedLayerViolation(
    'routes/lifeos-builderos-command-control-routes.js',
    BROKEN_ROUTE_SAMPLE,
  );
  assert.ok(hit);
  assert.equal(hit.code, 'ROUTE_STUB_REWRITE');
  assert.match(hit.detail, /document is not defined/);
}

function testMassShrinkDetection() {
  const shrunk = `${'// placeholder line\n'.repeat(120)}export function createLifeOSBuilderOSCommandControlRoutes() {}\n`;
  const hit = detectGeneratedLayerViolation(
    'routes/lifeos-builderos-command-control-routes.js',
    shrunk,
  );
  assert.ok(hit);
  assert.equal(hit.code, 'SERVER_FILE_MASS_SHRINK');
}

function testScopeIncomplete() {
  const miss = detectScopeIncomplete(
    COMMS_TASK,
    'routes/lifeos-builderos-command-control-routes.js',
    true,
  );
  assert.ok(miss);
  assert.equal(miss.code, 'SCOPE_INCOMPLETE');
  assert.ok(miss.missing.includes('public/overlay/lifeos-dashboard.html'));
}

function testEnforceTruthFailsCommsProofBuild() {
  const truth = enforceExecutionTruth({
    ok: true,
    committed: true,
    target_file: 'routes/lifeos-builderos-command-control-routes.js',
    generated_output: BROKEN_ROUTE_SAMPLE.repeat(20),
    task_meta: { output_bytes: 5400 },
  }, { action: 'build', task: COMMS_TASK });

  assert.equal(truth.pass_fail, 'FAIL');
  assert.ok(
    truth.failure_code === 'ROUTE_STUB_REWRITE' || truth.failure_code === 'SERVER_FILE_MASS_SHRINK',
  );
  assert.ok(truth.autopsy?.fix_steps?.length >= 3);
}

function testEnforceTruthRequiresShaOnBuild() {
  const truth = enforceExecutionTruth({
    ok: true,
    committed: true,
    target_file: 'services/small-helper.js',
    generated_output: 'export function ok() { return true; }\n',
    sha: null,
  }, { action: 'build', task: 'patch services/small-helper.js' });

  assert.equal(truth.pass_fail, 'FAIL');
  assert.equal(truth.failure_code, 'COMMIT_NO_SHA');
}

function testEnforceTruthPassWithSha() {
  const truth = enforceExecutionTruth({
    ok: true,
    committed: true,
    target_file: 'services/small-helper.js',
    generated_output: 'export function ok() { return true; }\n',
    sha: 'abc123def456',
  }, { action: 'build', task: 'patch services/small-helper.js' });

  assert.equal(truth.pass_fail, 'PASS');
  assert.equal(truth.receipt_truth, 'COMMIT_SHA_PRESENT');
}

testRouteStubDetection();
testMassShrinkDetection();
testScopeIncomplete();
testEnforceTruthFailsCommsProofBuild();
testEnforceTruthRequiresShaOnBuild();
testEnforceTruthPassWithSha();
console.log('✅ lifeos-execution-truth.test.js passed');
