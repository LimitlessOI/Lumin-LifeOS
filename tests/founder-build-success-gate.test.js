import assert from 'node:assert/strict';
import {
  verifyCssPatchLocal,
  verifyInlineCssInHtml,
  founderVerificationRequired,
  FOUNDER_BUILD_TOOL_INVENTORY,
} from '../services/founder-build-success-gate.js';
import { applyAssistantBubbleCssPatch, bumpServiceWorkerCache } from '../services/founder-css-patch.js';
import { enforceExecutionTruth } from '../services/lifeos-execution-truth.js';

function testInventoryHasCoreTools() {
  assert.ok(FOUNDER_BUILD_TOOL_INVENTORY.entry.includes('founder-interface'));
  assert.ok(FOUNDER_BUILD_TOOL_INVENTORY.truth.some((t) => t.includes('lifeos-execution-truth')));
  assert.ok(FOUNDER_BUILD_TOOL_INVENTORY.deploy.some((t) => t.includes('builder/ready')));
}

function testInlineCssDetection() {
  const html = `.msg.assistant { background: #ffeb3b; color: #000000; }`;
  const hit = verifyInlineCssInHtml(html, { background: '#ffeb3b', color: '#000000' });
  assert.equal(hit.ok, true);
  const miss = verifyInlineCssInHtml(html, { background: '#000000', color: '#ffffff' });
  assert.equal(miss.ok, false);
}

function testLocalCssPatchVerification() {
  const patch = applyAssistantBubbleCssPatch({
    root: process.cwd(),
    task: 'change response color to yellow with black text',
  });
  const local = verifyCssPatchLocal({ patchResult: patch });
  assert.equal(local.ok, true);
  assert.equal(patch.files.length, 4);
}

function testSwBump() {
  const out = bumpServiceWorkerCache("const CACHE_NAME   = 'lifeos-v2';");
  assert.match(out, /lifeos-\d+/);
}

function testFounderVerificationRequired() {
  assert.equal(founderVerificationRequired('change color to yellow', 'founder_css_patch'), true);
  assert.equal(founderVerificationRequired('what is queue status', 'builder_task_execute'), false);
}

function testEnforceTruthBlocksPassWithoutVisualProof() {
  const truth = enforceExecutionTruth({
    ok: true,
    committed: true,
    target_file: 'public/overlay/lifeos-theme-overrides.css',
    sha: 'abc123def456',
    generated_output: '.msg.assistant { background: #ffeb3b; }',
    execution_path: 'founder_css_patch',
    founder_verification_required: true,
    founder_verification: { ok: false, code: 'FOUNDER_VISUAL_NOT_VERIFIED', blocker: 'Live dashboard missing yellow.' },
    task_meta: {
      committed_files: [
        'public/overlay/lifeos-theme-overrides.css',
        'public/overlay/lifeos-dashboard.html',
        'public/overlay/lifeos-app.html',
        'public/overlay/sw.js',
      ],
    },
  }, { action: 'build', task: 'change response color to yellow with black text' });

  assert.equal(truth.pass_fail, 'FAIL');
  assert.equal(truth.failure_code, 'FOUNDER_VISUAL_NOT_VERIFIED');
}

function testEnforceTruthPassWithVisualProof() {
  const truth = enforceExecutionTruth({
    ok: true,
    committed: true,
    target_file: 'public/overlay/lifeos-dashboard.html, public/overlay/lifeos-app.html',
    sha: 'abc123def456',
    generated_output: '.msg.assistant { background: #ffeb3b; color: #000000; }',
    execution_path: 'founder_css_patch',
    founder_verification_required: true,
    founder_verification: {
      ok: true,
      code: 'FOUNDER_VISUAL_VERIFIED',
      surfaces: ['public/overlay/lifeos-dashboard.html', 'public/overlay/lifeos-app.html'],
    },
    task_meta: {
      committed_files: [
        'public/overlay/lifeos-theme-overrides.css',
        'public/overlay/lifeos-dashboard.html',
        'public/overlay/lifeos-app.html',
        'public/overlay/sw.js',
      ],
    },
  }, { action: 'build', task: 'change response color to yellow with black text' });

  assert.equal(truth.pass_fail, 'PASS');
  assert.match(truth.human_summary, /founder visual verified/i);
}

testInventoryHasCoreTools();
testInlineCssDetection();
testLocalCssPatchVerification();
testSwBump();
testFounderVerificationRequired();
testEnforceTruthBlocksPassWithoutVisualProof();
testEnforceTruthPassWithVisualProof();
console.log('founder-build-success-gate tests: PASS');
