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

test('blueprint gate passes platform_gap_fill for product spine with reason', () => {
  const reason =
    'GAP-FILL platform repair (governed loop): Integrate BuilderOS DONE gate into /build. Target: routes/lifeos-council-builder-routes.js. No mission BLUEPRINT.json; NSSOT §2.11 platform wiring.';
  const r = checkBuildBlueprintGate({
    target_file: 'routes/lifeos-council-builder-routes.js',
    platform_gap_fill: true,
    platform_gap_fill_reason: reason,
  });
  assert.equal(r.ok, true);
  assert.equal(r.platform_gap_fill, true);
});

test('blueprint gate still requires reason for platform_gap_fill', () => {
  const r = checkBuildBlueprintGate({
    target_file: 'routes/foo-routes.js',
    platform_gap_fill: true,
    platform_gap_fill_reason: 'too short',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'blueprint_gate_platform_gap_fill_reason');
});
