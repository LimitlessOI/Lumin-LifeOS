/**
 * SYNOPSIS: js — tests/builder-mission-selection.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBuilderActionable,
  getActiveBuilderMission,
  getFounderGatedMissions,
} from '../services/builder-mission-selection.js';

const pointBTarget = { mission_id: 'PRODUCT-LIFERE-OS-V1-0001', label: 'LifeRE Alpha' };

test('founder-gated Point B mission is not builder-actionable', () => {
  const item = {
    mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
    verdict: 'TECHNICAL_PASS',
    founder_usability_pass: false,
    blueprint_status: 'complete',
  };
  assert.equal(isBuilderActionable(item, { pointBTarget }), false);
});

test('getActiveBuilderMission skips founder-gated work and picks real build work', () => {
  const items = [
    { rank: 1, mission_id: 'PRODUCT-LIFERE-OS-V1-0001', verdict: 'TECHNICAL_PASS', founder_usability_pass: false, blueprint_status: 'complete' },
    { rank: 2, mission_id: 'PRODUCT-NEW-WORK-0001', blueprint_status: 'complete' },
  ];
  assert.equal(getActiveBuilderMission(items, { pointBTarget })?.mission_id, 'PRODUCT-NEW-WORK-0001');
  assert.deepEqual(
    getFounderGatedMissions(items, { pointBTarget }).map((m) => m.mission_id),
    ['PRODUCT-LIFERE-OS-V1-0001'],
  );
});

test('getActiveBuilderMission returns null when only founder-gated work remains', () => {
  const items = [
    { rank: 1, mission_id: 'PRODUCT-LIFERE-OS-V1-0001', verdict: 'TECHNICAL_PASS', founder_usability_pass: false, blueprint_status: 'complete' },
  ];
  assert.equal(getActiveBuilderMission(items, { pointBTarget }), null);
});
