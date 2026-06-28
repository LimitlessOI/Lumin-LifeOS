/**
 * SYNOPSIS: js — tests/bp-priority-completion.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompletionState, getActiveQueueItem } from '../services/bp-priority-completion.js';

test('Point B technical pass with founder false stays incomplete for scheduler', () => {
  const pointBTarget = { mission_id: 'PRODUCT-LIFERE-OS-V1-0001', label: 'LifeRE Alpha' };
  const item = {
    mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
    verdict: 'TECHNICAL_PASS',
    founder_usability_pass: false,
    blueprint_status: 'complete',
  };
  const state = getCompletionState(item, { pointBTarget, objectiveVerdict: { verdict: 'TECHNICAL_PASS', founder_usability_pass: false } });
  assert.equal(state.technical_pass, true);
  assert.equal(state.point_b_complete, false);
  assert.equal(state.queue_complete_for_scheduler, false);
  assert.equal(state.readiness_state, 'TECHNICAL_PASS_ONLY');
  assert.equal(state.required_next_action, 'founder_usability_confirmation');
});

test('Point B complete requires founder usability pass', () => {
  const pointBTarget = { mission_id: 'PRODUCT-LIFERE-OS-V1-0001', label: 'LifeRE Alpha' };
  const item = {
    mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
    verdict: 'TECHNICAL_PASS',
    founder_usability_pass: true,
    blueprint_status: 'complete',
  };
  const state = getCompletionState(item, { pointBTarget, objectiveVerdict: { verdict: 'TECHNICAL_PASS', founder_usability_pass: true } });
  assert.equal(state.point_b_complete, true);
  assert.equal(state.queue_complete_for_scheduler, true);
  assert.equal(state.readiness_state, 'POINT_B_COMPLETE');
});

test('Non-Point-B technical pass is complete enough for scheduler', () => {
  const pointBTarget = { mission_id: 'PRODUCT-LIFERE-OS-V1-0001', label: 'LifeRE Alpha' };
  const item = {
    mission_id: 'PRODUCT-OTHER-0001',
    verdict: 'TECHNICAL_PASS',
    founder_usability_pass: false,
    blueprint_status: 'complete',
  };
  const state = getCompletionState(item, { pointBTarget });
  assert.equal(state.queue_complete_for_scheduler, true);
  assert.equal(state.point_b_complete, false);
});

test('Active queue item returns Point B when founder confirmation is still missing', () => {
  const pointBTarget = { mission_id: 'PRODUCT-LIFERE-OS-V1-0001', label: 'LifeRE Alpha' };
  const items = [
    { rank: 1, mission_id: 'PRODUCT-CONVERSATION-COMMITMENTS-C2-0001', verdict: 'TECHNICAL_PASS', founder_usability_pass: false, blueprint_status: 'complete' },
    { rank: 2, mission_id: 'PRODUCT-LIFERE-OS-V1-0001', verdict: 'TECHNICAL_PASS', founder_usability_pass: false, blueprint_status: 'complete' },
  ];
  const active = getActiveQueueItem(items, { pointBTarget });
  assert.equal(active?.mission_id, 'PRODUCT-LIFERE-OS-V1-0001');
});
