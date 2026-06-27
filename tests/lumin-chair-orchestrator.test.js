/**
 * SYNOPSIS: js — tests/lumin-chair-orchestrator.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runLuminChairTurn,
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

test('pure counsel question routes chair (unified front door)', () => {
  const msg = 'what is the meaning of focus?';
  assert.equal(isPureCounselQuestion(msg), true);
  assert.equal(classifyChairIntent({ cleanedInput: msg }), 'chair');
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

test('chair native turn loads memory context for the active user, not hardcoded adam', async () => {
  let seenArgs = null;
  const result = await runLuminChairTurn({
    cleanedInput: 'I keep overcommitting and I need help thinking through that pattern.',
    normalizedText: 'I keep overcommitting and I need help thinking through that pattern.',
    sourceMode: 'text',
    conversationalMode: true,
    explicitAction: 'auto',
    shouldDisplayOnly: false,
    explicitExecute: false,
    userId: 42,
    userHandle: 'sherry',
    conversationHistory: [],
    alphaProbe: false,
  }, {
    loadChairMemoryContext: async (args) => {
      seenArgs = args;
      return 'PERSONAL TWIN:\nName: Sherry';
    },
    callCouncilMember: async () => '',
    translateChairPersonality: async ({ systemFacts }) => `memory=${systemFacts.memory_context || 'none'}`,
    sanitizeConversationReply: (text) => text,
    pool: null,
  });

  assert.deepEqual(seenArgs, { userId: 42, userHandle: 'sherry' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.chair_channel, 'chair');
  assert.match(result.body.human_summary_technical, /Sherry/);
});
