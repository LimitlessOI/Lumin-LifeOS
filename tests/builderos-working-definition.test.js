/**
 * SYNOPSIS: BuilderOS codegen self-repair + compound improvement tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCodegenFailure,
  buildCodegenRepairDispatch,
  mergeRepairIntoPlan,
  CODEGEN_REPAIR_PLAYBOOKS,
} from '../services/builderos-codegen-self-repair.js';
import { selectCompoundLever, recordCompoundImprovement } from '../services/builderos-compound-improvement.js';
import { getCanonicalExecutorManifest, buildPlanFromBlueprintStep } from '../services/builderos-canonical-executor.js';
import { classifyBuilderGap, summarizeGapFamilies } from '../services/builderos-gap-classifier.js';
import { auditHarnessToolWiring, loadHarnessToolsManifest } from '../services/builderos-harness-toolkit.js';

test('classifyBuilderGap maps placement and routing failures', () => {
  assert.equal(
    classifyBuilderGap({ failure_stage: 'placement', failure_reason: 'target_file not in placement metadata' })
      .failure_family,
    'MISSING_TARGET',
  );
  assert.equal(
    classifyBuilderGap({
      failure_stage: 'routing',
      failure_reason: 'Explicit model override claude unavailable (unknown_reason)',
    }).failure_family,
    'ROUTING_MODEL_UNAVAILABLE',
  );
  assert.equal(
    classifyBuilderGap({ failure_stage: 'validation', failure_reason: 'generated HTML is too short' })
      .failure_family,
    'TRUNCATED_OUTPUT',
  );
});

test('summarizeGapFamilies reduces other bucket for classified gaps', () => {
  const rows = [
    { failure_stage: 'placement', failure_reason: 'target_file not in placement metadata' },
    { failure_stage: 'validation', failure_reason: 'generated HTML is too short' },
    { failure_stage: 'safe_scope', failure_reason: 'Target file is outside the Builder safe-scope policy: data/x.json' },
  ];
  const stats = summarizeGapFamilies(rows.map((r) => ({ ...r, ...classifyBuilderGap(r) })));
  assert.equal(stats.other, 0);
  assert.ok(stats.otherPct <= 25);
});

test('classifyCodegenFailure detects truncation and done gate', () => {
  assert.equal(
    classifyCodegenFailure({ blocker: 'html too short' }).playbook,
    'TRUNCATED_OUTPUT',
  );
  assert.equal(
    classifyCodegenFailure({ blocker: 'BUILDEROS_DONE_BLOCKED missing_proof token_receipt' }).playbook,
    'DONE_GATE_BLOCKED',
  );
});

test('buildCodegenRepairDispatch returns strong model for truncation', () => {
  const c = classifyCodegenFailure({ blocker: 'truncated output' });
  const patch = buildCodegenRepairDispatch(c, {
    plan: { task: 'build x', target_file: 'services/foo.js' },
    attempt: 1,
  });
  assert.ok(patch.model);
  assert.match(patch.spec, /COMPLETE/i);
});

test('mergeRepairIntoPlan preserves plan_id', () => {
  const plan = { ok: true, plan_id: 'p1', task: 't', target_file: 'a.js' };
  const merged = mergeRepairIntoPlan(plan, {
    spec: 't repair',
    playbook: 'TRUNCATED_OUTPUT',
    repair_attempt: 1,
  });
  assert.equal(merged.plan_id, 'p1');
  assert.ok(merged.codegen_repair);
});

test('compound lever maps playbook to durable improvement', () => {
  assert.equal(
    selectCompoundLever({ playbook: 'ZONE3_PATCH' }),
    'zone3_patch_spec_routing',
  );
});

test('canonical manifest declares single primary path', () => {
  const m = getCanonicalExecutorManifest();
  assert.equal(m.canonical_path_id, 'builderos_canonical_v1');
  assert.ok(m.primary.includes('builderos-canonical-executor'));
});

test('recordCompoundImprovement returns classification', () => {
  const r = recordCompoundImprovement({
    source: 'test',
    blocker: 'syntaxerror unexpected token',
    success: false,
  });
  assert.equal(r.classification.playbook, 'SYNTAX_FAIL');
  assert.ok(r.lever);
});

test('recordCompoundImprovement uses gap classifier for safe scope', () => {
  const r = recordCompoundImprovement({
    source: 'test',
    blocker: 'Target file is outside the Builder safe-scope policy: data/x.json',
    failure_stage: 'safe_scope',
    success: false,
  });
  assert.equal(r.classification.playbook, 'SAFE_SCOPE_BLOCKED');
});

test('classifyCodegenFailure maps safe-scope 422 without done_gate false positive', () => {
  const c = classifyCodegenFailure({
    blocker: 'Target file is outside the Builder safe-scope policy',
    httpStatus: 422,
  });
  assert.equal(c.playbook, 'SAFE_SCOPE_BLOCKED');
});

test('buildPlanFromBlueprintStep rejects missing target_file', () => {
  assert.throws(
    () => buildPlanFromBlueprintStep({ step_id: 'X1' }, 'MISSION-1'),
    /missing target_file/,
  );
});

test('harness toolkit manifest loads and required tools exist on disk', () => {
  const manifest = loadHarnessToolsManifest();
  assert.ok(manifest.pillars?.envisioned_workflow);
  const audit = auditHarnessToolWiring({ manifest });
  assert.equal(audit.summary.required_missing, 0);
  assert.ok(audit.summary.wired >= 20);
});

test('playbook catalog covers industry failure families', () => {
  assert.ok(CODEGEN_REPAIR_PLAYBOOKS.includes('TRUNCATED_OUTPUT'));
  assert.ok(CODEGEN_REPAIR_PLAYBOOKS.includes('DONE_GATE_BLOCKED'));
});
