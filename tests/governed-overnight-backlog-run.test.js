/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateBlueprintTaskBatch,
  generateSupportTaskBatch,
} from '../scripts/governed-overnight-backlog-run.mjs';

function makeBlueprint(overrides = {}) {
  return {
    path: 'docs/projects/AMENDMENT_FAKE_BLUEPRINT.md',
    fileName: 'AMENDMENT_FAKE_BLUEPRINT.md',
    title: 'Fake Blueprint',
    lane: 'socialmediaos',
    rank: 1,
    text: '',
    firstExactTask: 'Implement the next slice in `services/example-service.js` with verifier coverage.',
    openDecisionSection: '',
    buildOrderRows: [],
    uncheckedChecklistItems: [],
    nextStepSignals: [],
    ...overrides,
  };
}

test('blueprint fallback proof task is attempted once across generations', async () => {
  const blueprint = makeBlueprint();
  const attemptedKeys = new Set([
    'docs/projects/AMENDMENT_FAKE_BLUEPRINT.md::exact:services/example-service.js',
  ]);

  const firstBatch = await generateBlueprintTaskBatch(1, attemptedKeys, { blueprints: [blueprint] });
  assert.equal(firstBatch.length, 1);
  assert.equal(firstBatch[0].category, 'blueprint_proof');
  assert.equal(firstBatch[0].target_file, 'docs/projects/builderos-remediation/amendment-fake-blueprint-proof-g1-100.md');

  const secondBatch = await generateBlueprintTaskBatch(2, attemptedKeys, { blueprints: [blueprint] });
  assert.deepEqual(secondBatch, []);
});

test('support self-improvement fallback is attempted once across generations', async () => {
  const attemptedKeys = new Set();
  const state = {
    tasks_done: 0,
    successful_repairs: 0,
    failed_repairs: 0,
    governance_prevented_drift: 0,
  };

  const firstBatch = await generateSupportTaskBatch(1, attemptedKeys, state, {
    openOCs: [],
    openGaps: [],
  });
  assert.equal(firstBatch.length, 1);
  assert.equal(firstBatch[0].id, 'runner-self-improvement');
  assert.equal(firstBatch[0].target_file, 'scripts/verify-runner-telemetry.mjs');

  const secondBatch = await generateSupportTaskBatch(2, attemptedKeys, state, {
    openOCs: [],
    openGaps: [],
  });
  assert.deepEqual(secondBatch, []);
});
