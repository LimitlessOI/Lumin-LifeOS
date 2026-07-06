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

test('getActiveBuilderMission skips missions in excludeMissionIds (anti-spin)', () => {
  const items = [
    { rank: 1, mission_id: 'PRODUCT-BLOCKED-0001', blueprint_status: 'complete' },
    { rank: 2, mission_id: 'PRODUCT-NEXT-WORK-0001', blueprint_status: 'complete' },
  ];
  // Without exclusion, the lowest-rank buildable mission is picked.
  assert.equal(getActiveBuilderMission(items, { pointBTarget })?.mission_id, 'PRODUCT-BLOCKED-0001');
  // Once blocked, it is skipped and the loop advances to the next mission.
  assert.equal(
    getActiveBuilderMission(items, { pointBTarget, excludeMissionIds: ['PRODUCT-BLOCKED-0001'] })?.mission_id,
    'PRODUCT-NEXT-WORK-0001',
  );
  // A Set is also accepted; when every buildable mission is excluded, returns null.
  assert.equal(
    getActiveBuilderMission(items, { pointBTarget, excludeMissionIds: new Set(['PRODUCT-BLOCKED-0001', 'PRODUCT-NEXT-WORK-0001']) }),
    null,
  );
});
