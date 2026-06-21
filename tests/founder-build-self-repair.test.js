/**
 * SYNOPSIS: js — tests/founder-build-self-repair.test.js.
 */
import assert from 'node:assert/strict';
import {
  augmentTaskWithGapFillScope,
  CANONICAL_FOUNDER_UI_TARGET,
  extractPriorBuildTask,
  inferTargetFileFromFounderFeedback,
  isCssOnlyUiFeedback,
  isMissingTargetFileBlocker,
  isRepairContinuationIntent,
  resolveFounderBuildTarget,
} from '../services/builder-instruction-target.js';
import { applyAssistantBubbleCssPatch } from '../services/founder-css-patch.js';

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
}

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
