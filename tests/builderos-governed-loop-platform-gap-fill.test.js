/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBuildBlueprintGate } from '../services/builder-blueprint-gate.js';
import {
  resolvePlatformGapFillForBuildDispatch,
  isPlatformRepairPlan,
  buildPlatformGapFillReason,
} from '../services/builderos-governed-loop-executor.js';

const DONE_GATE_INSTRUCTION =
  'Integrate BuilderOS DONE gate enforcement into the existing /build path.';

test('platform repair plan resolves platform_gap_fill for council-builder routes target', () => {
  const plan = {
    domain: 'lifeos-platform',
    task: `Execute BuilderOS instruction: ${DONE_GATE_INSTRUCTION}`,
    target_file: 'routes/lifeos-council-builder-routes.js',
  };
  const job = { instruction: DONE_GATE_INSTRUCTION, metadata_json: {} };

  assert.equal(isPlatformRepairPlan(plan, job), true);

  const gapFill = resolvePlatformGapFillForBuildDispatch(plan, job, { blueprint_id: undefined });
  assert.ok(gapFill);
  assert.equal(gapFill.platform_gap_fill, true);
  assert.ok(gapFill.platform_gap_fill_reason.length >= 40);
  assert.match(gapFill.platform_gap_fill_reason, /DONE gate/i);
  assert.match(gapFill.platform_gap_fill_reason, /lifeos-council-builder-routes\.js/);

  const gate = checkBuildBlueprintGate({
    target_file: plan.target_file,
    platform_gap_fill: gapFill.platform_gap_fill,
    platform_gap_fill_reason: gapFill.platform_gap_fill_reason,
  });
  assert.equal(gate.ok, true);
  assert.equal(gate.platform_gap_fill, true);
});

test('product spine build without blueprint still fails when not platform repair', () => {
  const plan = {
    domain: 'lifeos-platform',
    task: 'Execute BuilderOS instruction: Add finance export endpoint to LifeOS finance routes.',
    target_file: 'routes/lifeos-finance-routes.js',
  };
  const job = {
    instruction: 'Add finance export endpoint to LifeOS finance routes.',
    metadata_json: { target_file: plan.target_file },
  };

  assert.equal(isPlatformRepairPlan(plan, job), false);
  assert.equal(resolvePlatformGapFillForBuildDispatch(plan, job, {}), null);

  const gate = checkBuildBlueprintGate({ target_file: plan.target_file });
  assert.equal(gate.ok, false);
  assert.equal(gate.error, 'blueprint_gate_required');
});

test('platform_gap_fill is skipped when blueprint_id is present', () => {
  const plan = {
    domain: 'builderos-platform',
    target_file: 'services/builderos-control-plane-service.js',
  };
  const job = { instruction: DONE_GATE_INSTRUCTION, metadata_json: {}, blueprint_id: 'BP-123' };

  assert.equal(
    resolvePlatformGapFillForBuildDispatch(plan, job, { blueprint_id: 'BP-123' }),
    null,
  );
});

test('buildPlatformGapFillReason names the actual platform repair', () => {
  const reason = buildPlatformGapFillReason(
    { target_file: 'routes/lifeos-council-builder-routes.js' },
    { instruction: DONE_GATE_INSTRUCTION },
  );
  assert.ok(reason.length >= 40);
  assert.match(reason, /GAP-FILL platform repair/i);
  assert.match(reason, /DONE gate/i);
});
