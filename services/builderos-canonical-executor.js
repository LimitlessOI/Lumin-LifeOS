/**
 * SYNOPSIS: BuilderOS canonical execution — single autonomous programming entry point.
 * Planner/worker pattern: mission step → isolated build → verify → compound improve.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  classifyCodegenFailure,
  buildCodegenRepairDispatch,
  mergeRepairIntoPlan,
} from './builderos-codegen-self-repair.js';
import { recordCompoundImprovement } from './builderos-compound-improvement.js';
import { runDispatchGate } from './builderos-dispatch-gate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CANONICAL_PATH_ID = 'builderos_canonical_v1';
export const DEPRECATED_PATHS = Object.freeze([
  'POST /api/v1/system/build (auto-builder — opt-in only)',
  'lifeos-builder-continuous-queue (BUILDER_QUEUE_ENABLED=1 legacy)',
  'factory-staging direct commit without cutover receipt',
]);

function resolveBaseUrl(explicit) {
  return (
    explicit ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BUILDER_BASE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
}

function resolveCommandKey(explicit) {
  return explicit || process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

export function loadMissionBlueprint(missionId) {
  const blueprintPath = path.join(ROOT, 'builderos-reboot/MISSIONS', missionId, 'BLUEPRINT.json');
  if (!fs.existsSync(blueprintPath)) {
    throw new Error(`BLUEPRINT.json not found for ${missionId}`);
  }
  return JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
}

export function selectNextBlueprintStep(blueprint, { stepId = null } = {}) {
  const steps = [...(blueprint.steps || [])].sort((a, b) => String(a.step_id).localeCompare(String(b.step_id)));
  if (stepId) {
    const found = steps.find((s) => s.step_id === stepId);
    if (!found) throw new Error(`Step ${stepId} not found`);
    return found;
  }
  return steps[0] || null;
}

export function buildPlanFromBlueprintStep(step, missionId, blueprint = {}) {
  const targetFile = step.target_file || step.exact_inputs?.target_file;
  if (!targetFile) {
    throw new Error(`Blueprint step ${step.step_id || '?'} missing target_file — cannot plan canonical build`);
  }
  const title = step.title || step.step_id;
  return {
    ok: true,
    plan_id: `${missionId}-${step.step_id}`,
    domain: 'builderos-mission',
    mode: 'code',
    mission_id: missionId,
    step_id: step.step_id,
    blueprint_id: blueprintPathId(missionId),
    target_file: targetFile,
    task: `Execute BLUEPRINT step ${step.step_id} (${title}): implement ${targetFile} only.`,
    spec: step.content_or_patch_contract || step.exact_inputs?.spec || step.task || `Complete ${targetFile} per mission blueprint.`,
    commit_message: `[system-build] ${missionId} ${step.step_id}`,
    execution_tier: step.execution_tier || blueprint.execution_tier || 'MECHANICAL',
    platform_gap_fill: step.platform_gap_fill === true || blueprint.platform_gap_fill === true,
    platform_gap_fill_reason:
      step.platform_gap_fill_reason ||
      blueprint.platform_gap_fill_reason ||
      `GAP-FILL: Mechanical blueprint step ${step.step_id} for ${missionId}`,
    canonical_path: CANONICAL_PATH_ID,
  };
}

function blueprintPathId(missionId) {
  return `${missionId}-BLUEPRINT`;
}

async function postBuilderBuild(baseUrl, commandKey, body) {
  const url = `${baseUrl}/api/v1/lifeos/builder/build`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-command-key': commandKey,
    },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { ok: false, error: 'non_json_response' };
  }
  return { httpStatus: res.status, json, ok: res.ok && json?.ok === true, committed: json?.committed === true };
}

export async function executeCanonicalBlueprintStep({
  missionId,
  stepId = null,
  baseUrl,
  commandKey,
  maxRepairAttempts = 2,
  dryRun = false,
} = {}) {
  const blueprint = loadMissionBlueprint(missionId);
  const step = selectNextBlueprintStep(blueprint, { stepId });
  if (!step) {
    return { ok: false, error: 'no_steps_in_blueprint', canonical_path: CANONICAL_PATH_ID };
  }

  let plan = buildPlanFromBlueprintStep(step, missionId, blueprint);
  const resolvedBase = resolveBaseUrl(baseUrl);
  const resolvedKey = resolveCommandKey(commandKey);

  if (!resolvedKey) {
    return { ok: false, error: 'command_key_missing', stage: 'preflight', canonical_path: CANONICAL_PATH_ID };
  }

  const gate = await runDispatchGate({
    allowStaleDeploy: true,
    baseUrl: resolvedBase,
    commandKey: resolvedKey,
  });
  if (!gate.ok) {
    return {
      ok: false,
      error: 'dispatch_gate_blocked',
      stage: 'preflight',
      gate,
      canonical_path: CANONICAL_PATH_ID,
    };
  }

  if (dryRun) {
    return { ok: true, dry_run: true, plan, step, canonical_path: CANONICAL_PATH_ID };
  }

  let lastResult = null;
  for (let attempt = 0; attempt <= maxRepairAttempts; attempt += 1) {
    const body = {
      domain: plan.domain,
      mode: plan.mode || 'code',
      task: plan.task,
      spec: plan.spec,
      target_file: plan.target_file,
      blueprint_id: plan.blueprint_id,
      mission_id: missionId,
      metadata: {
        mission_id: missionId,
        step_id: step.step_id,
        execution_tier: plan.execution_tier,
        canonical_path: CANONICAL_PATH_ID,
        codegen_repair: plan.codegen_repair || null,
      },
      platform_gap_fill: plan.platform_gap_fill === true,
      platform_gap_fill_reason: plan.platform_gap_fill_reason,
      model: plan.model,
      max_output_tokens: plan.max_output_tokens,
    };

    const dispatch = await postBuilderBuild(resolvedBase, resolvedKey, body);
    lastResult = dispatch;

    if (dispatch.committed) {
      if (/\.(js|mjs|cjs)$/i.test(plan.target_file || '')) {
        const absTarget = path.join(ROOT, plan.target_file);
        if (fs.existsSync(absTarget)) {
          const syntax = spawnSync(process.execPath, ['--check', absTarget], { encoding: 'utf8' });
          if (syntax.status !== 0) {
            recordCompoundImprovement({
              source: 'canonical_executor',
              mission_id: missionId,
              step_id: step.step_id,
              target_file: plan.target_file,
              blocker: 'POST_BUILD_SYNTAX_FAIL',
              success: false,
            });
            return {
              ok: false,
              committed: true,
              syntax_check_failed: true,
              attempt,
              plan,
              step,
              dispatch,
              canonical_path: CANONICAL_PATH_ID,
              blocker: 'POST_BUILD_SYNTAX_FAIL',
            };
          }
        }
      }
      recordCompoundImprovement({
        source: 'canonical_executor',
        mission_id: missionId,
        step_id: step.step_id,
        target_file: plan.target_file,
        success: true,
      });
      return {
        ok: true,
        committed: true,
        attempt,
        plan,
        step,
        dispatch,
        canonical_path: CANONICAL_PATH_ID,
      };
    }

    const blocker = dispatch.json?.blocker || dispatch.json?.error || `http_${dispatch.httpStatus}`;
    const classification = classifyCodegenFailure({
      blocker,
      code: dispatch.json?.code,
      error: dispatch.json?.error,
      builderResult: dispatch.json,
      httpStatus: dispatch.httpStatus,
    });

    recordCompoundImprovement({
      source: 'canonical_executor',
      mission_id: missionId,
      step_id: step.step_id,
      target_file: plan.target_file,
      blocker,
      code: dispatch.json?.code,
      error: dispatch.json?.error,
      builderResult: dispatch.json,
      httpStatus: dispatch.httpStatus,
      success: false,
    });

    if (attempt >= maxRepairAttempts || !classification.repairable) {
      return {
        ok: false,
        committed: false,
        attempt,
        plan,
        step,
        dispatch,
        classification,
        canonical_path: CANONICAL_PATH_ID,
        blocker,
      };
    }

    const repairPatch = buildCodegenRepairDispatch(classification, { plan, attempt: attempt + 1 });
    plan = mergeRepairIntoPlan(plan, repairPatch);
  }

  return {
    ok: false,
    error: 'repair_exhausted',
    lastResult,
    canonical_path: CANONICAL_PATH_ID,
  };
}

export function executeCanonicalWorktreeStep({ missionId, stepId, dryRun = false } = {}) {
  const script = path.join(ROOT, 'scripts/autonomy/builder-supervisor.js');
  if (!fs.existsSync(script)) {
    return { ok: false, error: 'worktree_supervisor_missing' };
  }
  if (dryRun) {
    return { ok: true, dry_run: true, path: 'worktree_harness', script };
  }
  const blueprint = loadMissionBlueprint(missionId);
  const step = selectNextBlueprintStep(blueprint, { stepId });
  const r = spawnSync(
    process.execPath,
    [script, '--dry-run', '--project', missionId],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000 },
  );
  return {
    ok: r.status === 0,
    path: 'worktree_harness',
    status: r.status,
    stdout: String(r.stdout || '').slice(0, 2000),
    stderr: String(r.stderr || '').slice(0, 1000),
    step_id: step?.step_id,
  };
}

export function getCanonicalExecutorManifest() {
  return {
    schema: 'builderos_canonical_executor_v1',
    canonical_path_id: CANONICAL_PATH_ID,
    primary: 'services/builderos-canonical-executor.js → POST /api/v1/lifeos/builder/build + codegen self-repair',
    secondary: 'executeCanonicalWorktreeStep → scripts/autonomy/builder-supervisor.js (parallel workers)',
    governed: 'executeCommandControlJob → builderos-governed-loop-executor.js',
    deprecated: DEPRECATED_PATHS,
    industry_patterns: [
      'planner_worker_isolation',
      'sandbox_worktree',
      'evidence_backed_completion',
      'compound_improvement_on_failure',
    ],
  };
}
