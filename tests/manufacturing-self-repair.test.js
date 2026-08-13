/**
 * SYNOPSIS: Deterministic manufacturing self-repair — sealed exact promote,
 * cost stamp, watchdog playbooks, stale ship-lock reclaim.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  promoteSealedExactOnThrash,
  applyManufacturingSelfRepair,
  executeManufacturingWatchdogPlaybooks,
  sealedExactSourcePath,
  forceCollectiblesNeverStopHeal,
} from '../services/manufacturing-self-repair.js';
import { reviveStaleBlockedSteps } from '../services/product-build-orchestrator.js';
import { toGovernedShipStep } from '../factory-staging/factory-core/bpb/build-queue-step-adapter.js';
import { evaluateSystemWatchdog } from '../scripts/lib/system-watchdog.mjs';

test('sealedExactSourcePath reads exact_inputs then exactness.rebuild', () => {
  assert.equal(
    sealedExactSourcePath({ exact_inputs: { content_source_path: 'twins/a.exact' } }),
    'twins/a.exact',
  );
  assert.equal(
    sealedExactSourcePath({
      exactness: { rebuild: { content_source_path: 'twins/b.exact' } },
    }),
    'twins/b.exact',
  );
});

test('promoteSealedExactOnThrash forces write_file_exact on author thrash', () => {
  const step = {
    id: 'COLLECTIBLES-V1-TWIN-SERVICE-001',
    status: 'blocked',
    action_type: 'author_then_write',
    last_error: 'import_resolution_failed:deepseek: ENOENT',
    exactness: {
      sealed: true,
      rebuild: {
        action_type: 'write_file_exact',
        content_source_path: 'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact',
      },
    },
  };
  const result = promoteSealedExactOnThrash(step);
  assert.equal(result.promoted, true);
  assert.equal(step.action_type, 'write_file_exact');
  assert.equal(
    step.exact_inputs.content_source_path,
    'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact',
  );
  assert.equal(step.tokens_used, 0);
  assert.ok(Number(step.duration_ms) > 0);
});

test('applyManufacturingSelfRepair stamps SLICE_COST_UNTRACKED on sealed exact', () => {
  const exact = 'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact';
  const queue = {
    steps: [{
      id: 'S1',
      status: 'pending',
      action_type: 'write_file_exact',
      last_error: 'SLICE_COST_UNTRACKED',
      exact_inputs: { content_source_path: exact },
    }],
  };
  const out = applyManufacturingSelfRepair(queue);
  assert.deepEqual(out.promoted, ['S1']);
  assert.equal(queue.steps[0].tokens_used, 0);
});

test('toGovernedShipStep keeps content_source_path as write_file_exact', () => {
  const step = {
    id: 'EXACT-1',
    target_file: 'services/collectibles/twin-service.js',
    action_type: 'write_file_exact',
    exact_inputs: {
      content_source_path: 'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact',
    },
    assertion_spec: { file_contains: ['export'] },
    expected_exports: ['createTwinService'],
  };
  const out = toGovernedShipStep(step, { product_id: 'universal-overlay' });
  assert.equal(out.ok, true);
  assert.equal(out.step.action_type, 'write_file_exact');
  assert.equal(
    out.step.exact_inputs.content_source_path,
    'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact',
  );
});

test('toGovernedShipStep promotes thrashing sealed exact before ship classify', () => {
  const step = {
    id: 'EXACT-2',
    target_file: 'services/collectibles/twin-service.js',
    action_type: 'author_then_write',
    last_error: 'codegen_authoring_failed:import_resolution_failed',
    attempts: 2,
    exactness: {
      sealed: true,
      rebuild: {
        content_source_path: 'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact',
      },
    },
    assertion_spec: { file_contains: ['export'] },
    expected_exports: ['createTwinService'],
  };
  const out = toGovernedShipStep(step, { product_id: 'universal-overlay' });
  assert.equal(out.ok, true);
  assert.equal(out.step.action_type, 'write_file_exact');
});

test('watchdog flags lane_ship_already_running with retry action', () => {
  const { ok, findings } = evaluateSystemWatchdog({
    laneShip: { ok: false, reason: 'already_running' },
    factoryId: 'factory-3',
  });
  assert.equal(ok, false);
  const hit = findings.find((f) => f.id === 'lane_ship_already_running');
  assert.ok(hit);
  assert.equal(hit.action, 'retry_ship_after_reclaim');
});

test('executeManufacturingWatchdogPlaybooks promotes on lane_sentry_failed', () => {
  const exact = 'docs/products/universal-overlay/twins/steps/COLLECTIBLES-V1-TWIN-SERVICE-001.exact';
  const queue = {
    steps: [{
      id: 'SENTRY-1',
      status: 'blocked',
      action_type: 'author_then_write',
      last_error: 'SENTRY_FAILED:missing:identity_status',
      exact_inputs: { content_source_path: exact },
    }],
  };
  const out = executeManufacturingWatchdogPlaybooks(
    { findings: [{ id: 'lane_sentry_failed' }] },
    queue,
  );
  assert.ok(out.applied.includes('manufacturing_self_repair'));
  assert.ok(out.tip_actions.includes('re_ship_after_promote'));
  assert.equal(queue.steps[0].action_type, 'write_file_exact');
});

test('forceCollectiblesNeverStopHeal unskips + promotes CAPTURE convention exact', () => {
  const queue = {
    steps: [{
      id: 'COLLECTIBLES-V1-CAPTURE-API-001',
      product_id: 'collectibles',
      source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — Architect-sealed print',
      status: 'skipped',
      demoted: true,
      demote_reason: 'revive_exhausted:codegen_stub',
      action_type: 'author_then_write',
      last_error: 'codegen_authoring_failed: codegen_stub_detected',
      revive_count: 9,
      escalation_required: true,
    }],
  };
  const out = forceCollectiblesNeverStopHeal(queue);
  assert.ok(out.healed.includes('COLLECTIBLES-V1-CAPTURE-API-001'));
  assert.equal(queue.steps[0].status, 'pending');
  assert.equal(queue.steps[0].demoted, false);
  assert.equal(queue.steps[0].escalation_required, false);
  assert.equal(queue.steps[0].action_type, 'write_file_exact');
  assert.match(
    queue.steps[0].exact_inputs.content_source_path,
    /COLLECTIBLES-V1-CAPTURE-API-001\.exact$/,
  );
  assert.ok(out.promoted.includes('COLLECTIBLES-V1-CAPTURE-API-001'));
});

test('factory3_idle playbook heals and requests reship', () => {
  const queue = {
    steps: [{
      id: 'COLLECTIBLES-V1-CAPTURE-API-001',
      product_id: 'collectibles',
      source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — Architect-sealed print',
      status: 'blocked',
      action_type: 'author_then_write',
      last_error: 'codegen_authoring_failed: codegen_stub_detected',
      attempts: 1,
    }],
  };
  const out = executeManufacturingWatchdogPlaybooks(
    { findings: [{ id: 'factory3_idle_with_collectibles_work' }] },
    queue,
  );
  assert.ok(out.applied.includes('collectibles_never_stop_heal'));
  assert.ok(out.tip_actions.includes('re_ship_after_promote'));
  assert.equal(queue.steps[0].action_type, 'write_file_exact');
});

test('reviveStaleBlockedSteps never demotes Collectibles print on revive budget', () => {
  const step = {
    id: 'COLLECTIBLES-V1-CAPTURE-API-001',
    product_id: 'collectibles',
    source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — Architect-sealed print',
    status: 'blocked',
    last_error: 'codegen_authoring_failed:import_resolution_failed',
    last_attempt_at: new Date(Date.now() - 120_000).toISOString(),
    revive_count: 99,
    attempts: 3,
  };
  const queue = { steps: [step] };
  const revived = reviveStaleBlockedSteps(queue, { cooldownMs: 0, maxRevives: 6 });
  assert.deepEqual(revived, ['COLLECTIBLES-V1-CAPTURE-API-001']);
  assert.equal(step.status, 'pending');
  assert.equal(step.demoted, false);
  assert.notEqual(step.status, 'skipped');
});
