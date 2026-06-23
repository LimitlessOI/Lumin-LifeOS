/**
 * SYNOPSIS: js — tests/founder-packet-v2-unified-gate.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  enforceFounderPacketV2Unified,
  resolveMissionFolder,
} from '../services/founder-packet-v2-unified-gate.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('resolves LifeRE mission folder from text', () => {
  const r = resolveMissionFolder({
    cleanedInput: 'Build PRODUCT-LIFERE-OS-V1-0001 daily command',
  });
  assert.equal(r.mission_id, 'PRODUCT-LIFERE-OS-V1-0001');
  assert.ok(r.folder);
});

test('LifeRE mission passes IDC + builder entry on execute channel', async () => {
  const result = await enforceFounderPacketV2Unified({
    cleanedInput: 'Build LifeRE auto-load daily command on open',
    understanding: {
      intent_understood: true,
      outcome_hypothesis: 'Auto-load daily command',
    },
    missionId: 'PRODUCT-LIFERE-OS-V1-0001',
    channel: 'build_async',
    confirmIntent: true,
  });
  assert.equal(result.idc_exit?.pass, true);
  assert.equal(result.builder_entry?.pass, true);
  assert.equal(result.execute_cleared, true);
});

test('blocks execute without mission and without gap fill', async () => {
  const result = await enforceFounderPacketV2Unified({
    cleanedInput: 'change something vague',
    understanding: { intent_understood: false },
    channel: 'builder_api',
  });
  assert.equal(result.execute_cleared, false);
  assert.ok(result.violations.some((v) => /INTENT_AMBIGUITY|MISSION_BOUNDARY|LISTEN_ONLY/i.test(v)));
});

console.log('✅ founder-packet-v2-unified-gate.test.js passed');
