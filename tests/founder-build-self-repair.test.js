/**
 * SYNOPSIS: js — tests/founder-build-self-repair.test.js.
 */
import assert from 'node:assert/strict';
import {
  augmentTaskWithGapFillScope,
  CANONICAL_FOUNDER_UI_TARGET,
  extractPriorBuildTask,
  extractTargetFileFromInstruction,
  inferTargetFileFromFounderFeedback,
  isCssOnlyUiFeedback,
  isMissingTargetFileBlocker,
  isRepairContinuationIntent,
  resolveFounderBuildTarget,
} from '../services/builder-instruction-target.js';
import { applyAssistantBubbleCssPatch } from '../services/founder-css-patch.js';
import {
  applyVoiceSendWirePatch,
  isVoiceSendWireOrder,
} from '../services/founder-voice-send-patch.js';
import { assessFounderBuildClarity } from '../services/founder-intent-clarify.js';
import {
  augmentTaskWithTruncationCorrection,
  isTruncationBlocker,
} from '../services/founder-build-self-repair.js';

function testInfersUiTargetFromColorRequest() {
  const hit = inferTargetFileFromFounderFeedback(
    'can you change the color of your responses from black to yellow with black text',
  );
  assert.ok(hit);
  assert.equal(hit.target_file, 'public/overlay/lifeos-theme-overrides.css');
  assert.equal(hit.source, 'css_only_heuristic');
}

function testExplicitPathWins() {
  const hit = inferTargetFileFromFounderFeedback(
    'change button color in public/overlay/lifeos-dashboard.html',
  );
  assert.equal(hit.target_file, 'public/overlay/lifeos-dashboard.html');
}

function testResolveFounderBuildTarget() {
  assert.equal(
    resolveFounderBuildTarget('make responses yellow in the chat'),
    'public/overlay/lifeos-theme-overrides.css',
  );
  assert.equal(resolveFounderBuildTarget('what is the queue status'), null);
}

function testMissingTargetBlocker() {
  assert.equal(isMissingTargetFileBlocker('target_file is required'), true);
  assert.equal(isMissingTargetFileBlocker('too short'), false);
}

function testRepairContinuationIntent() {
  assert.equal(isRepairContinuationIntent('keep trying'), true);
  assert.equal(isRepairContinuationIntent('fix why you failed'), true);
  assert.equal(isRepairContinuationIntent('what is on the queue'), false);
}

function testExtractPriorBuildTask() {
  const messages = [
    { role: 'user', content: 'change response color to yellow with black text' },
    { role: 'assistant', content: 'FAIL target_file is required' },
    { role: 'user', content: 'keep trying' },
  ];
  const prior = extractPriorBuildTask(messages, 'keep trying');
  assert.equal(prior, 'change response color to yellow with black text');
}

function testAugmentTaskAddsTargetFile() {
  const out = augmentTaskWithGapFillScope('change colors', CANONICAL_FOUNDER_UI_TARGET);
  assert.match(out, /target_file: public\/overlay\/lifeos-app\.html/);
  assert.match(out, /GAP-FILL/);
}

function testCssOnlyAllowsAddYellow() {
  assert.equal(isCssOnlyUiFeedback('add a yellow background to assistant responses'), true);
}

function testMechanicalCssPatch() {
  const patch = applyAssistantBubbleCssPatch({
    root: process.cwd(),
    task: 'change response color to yellow with black text',
  });
  assert.equal(patch.ok, true);
  assert.equal(patch.files.length, 4);
  assert.match(patch.files[0].output, /\.lumin-msg\.assistant/);
  assert.match(patch.files[1].output, /\.msg\.assistant[\s\S]*#ffeb3b/);
  assert.match(patch.files[2].output, /\.lumin-msg\.assistant[\s\S]*#ffeb3b/);
  assert.match(patch.files[1].output, /lifeos-theme-overrides\.css\?v=/);
  assert.match(patch.files[3].output, /CACHE_NAME/);
}

function testCssOnlyRoutesToThemeOverrides() {
  const target = resolveFounderBuildTarget('change response color to yellow with black text');
  assert.equal(target, 'public/overlay/lifeos-theme-overrides.css');
}

function testCssOnlyNotStructural() {
  assert.equal(isCssOnlyUiFeedback('add a new drawer button'), false);
  assert.equal(isCssOnlyUiFeedback('change response color to yellow'), true);
  assert.equal(
    isCssOnlyUiFeedback('fix voice send in public/overlay/lifeos-app.html — post message like click send'),
    false,
  );
}

function testVoiceSendWireOrder() {
  const order = 'do: fix voice send in public/overlay/lifeos-app.html — when user says send it after dictation, post message like click send. Receipt the change.';
  assert.equal(isVoiceSendWireOrder(order), true);
  assert.equal(isCssOnlyUiFeedback(order), false);
}

function testVoiceSendMechanicalPatch() {
  const order = 'fix voice send in public/overlay/lifeos-app.html — say send it to post';
  const patch = applyVoiceSendWirePatch({ root: process.cwd(), task: order });
  assert.equal(patch.ok, true);
  assert.match(patch.files[0].output, /founder-lumin-voice-send:start/);
  assert.match(patch.files[0].output, /lifeos-voice-chat\.js/);
  assert.match(patch.files[0].output, /dictate_then_send: voiceTurn,/);
}

function testBareOverlayFilename() {
  assert.equal(extractTargetFileFromInstruction('patch lifeos-app.html'), 'public/overlay/lifeos-app.html');
  const t5 = 'add HTML comment <!-- x --> before lumin drawer in lifeos-app.html';
  assert.equal(assessFounderBuildClarity('do: ' + t5, t5).needs_clarify, false);
}

function testTruncationBlockerClassification() {
  // Truncation/completeness gate errors (from the pre-commit gates) are retriable-on-same-target.
  assert.equal(isTruncationBlocker('Pre-commit syntax check failed — commit blocked'), true);
  assert.equal(isTruncationBlocker('SQL migration appears truncated — 1 unclosed parenthesis'), true);
  assert.equal(isTruncationBlocker('generated JSON is invalid (likely truncated): Unexpected end of JSON input'), true);
  assert.equal(isTruncationBlocker('generated output too short'), true);
  // Logical/scope blockers are NOT truncation — must not trigger a blind regenerate loop.
  assert.equal(isTruncationBlocker('target_file is required'), false);
  assert.equal(isTruncationBlocker('BLOCKED_FOUNDER_PACKET_V2'), false);
  assert.equal(isTruncationBlocker('blueprint_gate_required'), false);
}

function testTruncationCorrectionFeedsExactError() {
  const out = augmentTaskWithTruncationCorrection(
    'add a helper to routes/lifeos-auth-routes.js',
    'SQL migration appears truncated — 1 unclosed parenthesis',
  );
  assert.match(out, /add a helper to routes\/lifeos-auth-routes\.js/);
  assert.match(out, /CORRECTION/);
  assert.match(out, /1 unclosed parenthesis/); // exact gate error fed back to the model
  assert.match(out, /COMPLETE output/);
}

testTruncationBlockerClassification();
testTruncationCorrectionFeedsExactError();

testBareOverlayFilename();

testCssOnlyAllowsAddYellow();
testMechanicalCssPatch();
testCssOnlyRoutesToThemeOverrides();
testCssOnlyNotStructural();
testExplicitPathWins();
testResolveFounderBuildTarget();
testMissingTargetBlocker();
testRepairContinuationIntent();
testExtractPriorBuildTask();
testAugmentTaskAddsTargetFile();
console.log('founder-build-self-repair tests: PASS');
