/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBuildBlueprintGate } from '../services/builder-blueprint-gate.js';

test('blueprint gate skips non-product targets', () => {
  const r = checkBuildBlueprintGate({ target_file: 'scripts/foo.mjs' });
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
});

test('blueprint gate requires blueprint for routes/', () => {
  const r = checkBuildBlueprintGate({ target_file: 'routes/foo-routes.js' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'blueprint_gate_required');
});

test('blueprint gate passes when mission blueprint covers target', () => {
  const r = checkBuildBlueprintGate({
    target_file: 'services/voice-rail-v1.js',
    mission_id: 'PRODUCT-VOICE-RAIL-V1-0001',
  });
  assert.equal(r.ok, true);
  assert.match(r.blueprint_path, /PRODUCT-VOICE-RAIL-V1-0001\/BLUEPRINT\.json$/);
});

test('blueprint gate rejects target not in blueprint steps', () => {
  const r = checkBuildBlueprintGate({
    target_file: 'routes/totally-new-routes.js',
    mission_id: 'PRODUCT-VOICE-RAIL-V1-0001',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'blueprint_gate_target_not_in_scope');
});
