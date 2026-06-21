import assert from 'node:assert/strict';
import {
  augmentTaskWithGapFillScope,
  CANONICAL_FOUNDER_UI_TARGET,
  extractPriorBuildTask,
  inferTargetFileFromFounderFeedback,
  isMissingTargetFileBlocker,
  isRepairContinuationIntent,
  resolveFounderBuildTarget,
} from '../services/builder-instruction-target.js';

function testInfersUiTargetFromColorRequest() {
  const hit = inferTargetFileFromFounderFeedback(
    'can you change the color of your responses from black to yellow with black text',
  );
  assert.ok(hit);
  assert.equal(hit.target_file, CANONICAL_FOUNDER_UI_TARGET);
  assert.equal(hit.source, 'ui_heuristic');
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
    CANONICAL_FOUNDER_UI_TARGET,
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

testInfersUiTargetFromColorRequest();
testExplicitPathWins();
testResolveFounderBuildTarget();
testMissingTargetBlocker();
testRepairContinuationIntent();
testExtractPriorBuildTask();
testAugmentTaskAddsTargetFile();
console.log('founder-build-self-repair tests: PASS');
