/**
 * SYNOPSIS: js — tests/lumin-chair-orchestrator.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyChairIntent,
  isBlueprintExecuteIntent,
  isBuildRequest,
  isExplicitExecuteCommand,
  isPureCounselQuestion,
} from '../services/lumin-chair-orchestrator.js';
import { isMissionPipelineIntent } from '../services/lifeos-mission-pipeline-executor.js';

test('build the blueprint routes to blueprint_execute not build_async', () => {
  const msg = 'build the blueprint';
  assert.equal(isBlueprintExecuteIntent(msg), true);
  assert.equal(isBuildRequest(msg), false);
  assert.equal(
    classifyChairIntent({ cleanedInput: msg, useTerminalForBuild: false }),
    'blueprint_execute',
  );
});

test('execute mission routes to blueprint_execute', () => {
  const msg = 'execute the mission';
  assert.equal(classifyChairIntent({ cleanedInput: msg }), 'blueprint_execute');
});

test('generic UI build still routes build_async', () => {
  const msg = 'change the response bubble color to yellow';
  assert.equal(isBuildRequest(msg), true);
  assert.equal(
    classifyChairIntent({ cleanedInput: msg, useTerminalForBuild: false }),
    'build_async',
  );
});

test('display-only flag wins first', () => {
  assert.equal(
    classifyChairIntent({
      cleanedInput: 'build the blueprint',
      shouldDisplayOnly: true,
    }),
    'display',
  );
});

test('pure counsel question routes lumin (unified front door)', () => {
  const msg = 'what is the meaning of focus?';
  assert.equal(isPureCounselQuestion(msg), true);
  assert.equal(classifyChairIntent({ cleanedInput: msg }), 'lumin');
});

test('LifeRE next-step language routes point_b', () => {
  const msg = 'what should we do next on LifeRE';
  assert.equal(classifyChairIntent({ cleanedInput: msg }), 'point_b');
});

test('explicit execute without build routes execute', () => {
  assert.equal(
    classifyChairIntent({
      cleanedInput: 'ship it',
      explicitExecute: isExplicitExecuteCommand('ship it'),
    }),
    'execute',
  );
});

test('build LifeRE Point B usability routes build_async not mission_pipeline', () => {
  const msg = 'Build LifeRE Point B usability — auto-load daily command on open';
  assert.equal(isBuildRequest(msg), true);
  assert.equal(isMissionPipelineIntent(msg), false);
  assert.equal(
    classifyChairIntent({ cleanedInput: msg, useTerminalForBuild: false }),
    'build_async',
  );
});
