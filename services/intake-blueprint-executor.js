/**
 * SYNOPSIS: Execute ARC-ready intake skeleton blueprints step-by-step via POST /lifeos/builder/build.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import { isSafeTarget } from '../config/builder-safe-scope.js';

export function sortIntakeSteps(steps = []) {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const sorted = [];
  const seen = new Set();

  function visit(step) {
    if (!step || seen.has(step.id)) return;
    for (const dep of step.deps || []) {
      const parent = byId.get(dep);
      if (parent) visit(parent);
    }
    seen.add(step.id);
    sorted.push(step);
  }

  for (const step of steps) visit(step);
  return sorted;
}

export function stepTargetFile(step) {
  return step?.file || step?.target_file || null;
}

export function buildStepDispatchBody(step, blueprint, sessionId) {
  const targetFile = stepTargetFile(step);
  const product = blueprint._meta?.product || 'product';
  const ssot = step.ssot_tag || blueprint._meta?.parent_ssot || blueprint._meta?.ssot_tag || '';
  const typeHint = {
    sql: 'SQL migration (CREATE TABLE IF NOT EXISTS, idempotent indexes). Use pool.query from ctx — owner_id TEXT from req.lifeosUser.sub.',
    esm: 'ESM module — factory pattern for routes; export functions for services. Match existing codebase patterns.',
    esm_script: 'Standalone node .mjs acceptance script — exit 0 on PASS, non-zero on FAIL.',
    html: 'HTML overlay page in public/overlay/',
  }[step.type] || 'Implement per blueprint purpose.';

  return {
    domain: 'lifeos',
    mode: 'code',
    execution_only: true,
    target_file: targetFile,
    task: `[intake-blueprint] ${step.id}: ${step.purpose || product}`,
    spec: [
      `Product: ${product}`,
      `Blueprint step: ${step.id}`,
      `Type: ${step.type}`,
      `Purpose: ${step.purpose || 'implement step'}`,
      `SSOT: ${ssot}`,
      typeHint,
      'Do not modify server.js or core/two-tier-system-init.js — register routes via existing factory pattern only.',
    ].join('\n'),
    blueprint_intake_session_id: sessionId,
    blueprint_step_id: step.id,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: mechanical intake blueprint step ${step.id} for ${product} — ARC-ready session ${sessionId}, founder gaps resolved`,
    commit_message: `[system-build] ${product} ${step.id} ${targetFile}`,
    files: depsToContextFiles(step, blueprint),
  };
}

function depsToContextFiles(step, blueprint) {
  const files = [];
  const byId = new Map((blueprint.steps || []).map((s) => [s.id, s]));
  for (const depId of step.deps || []) {
    const dep = byId.get(depId);
    const f = dep && stepTargetFile(dep);
    if (f && !files.includes(f)) files.push(f);
  }
  if (blueprint._meta?.parent_ssot) files.push(blueprint._meta.parent_ssot);
  return files.slice(0, 8);
}

export async function loadIntakeSession(sessionId, { pool = null, baseUrl = null, commandKey = null } = {}) {
  if (pool?.query) {
    const { rows } = await pool.query(
      'SELECT id, product_name, status, blueprint_json, arc_report_json, amendment_file FROM blueprint_intake_sessions WHERE id = $1',
      [sessionId]
    );
    return rows[0] || null;
  }
  if (baseUrl && commandKey) {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/blueprint/intake/${sessionId}`, {
      headers: { 'x-command-center-key': commandKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session || null;
  }
  return null;
}

export async function verifyIntakeSessionBuildClearance(pool, sessionId, targetFile, stepId = null) {
  if (!pool?.query || !sessionId) {
    return { ok: false, error: 'pool_or_session_missing' };
  }
  const { rows } = await pool.query(
    'SELECT id, product_name, status, blueprint_json, arc_report_json, amendment_file FROM blueprint_intake_sessions WHERE id = $1',
    [sessionId]
  );
  const session = rows[0];
  if (!session) return { ok: false, error: 'intake_session_not_found' };
  if (session.status !== 'ready') {
    return { ok: false, error: 'intake_session_not_ready', status: session.status };
  }
  if (!session.arc_report_json?.ready_to_execute) {
    return { ok: false, error: 'arc_not_ready', arc: session.arc_report_json };
  }
  const blueprint = session.blueprint_json;
  if (!blueprint?.steps?.length) {
    return { ok: false, error: 'blueprint_empty' };
  }

  const normalizedTarget = String(targetFile || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const step = stepId
    ? blueprint.steps.find((s) => s.id === stepId)
    : blueprint.steps.find((s) => stepTargetFile(s) === normalizedTarget);

  if (!step) {
    return { ok: false, error: 'step_not_in_blueprint', target_file: normalizedTarget, step_id: stepId };
  }
  if (stepTargetFile(step) !== normalizedTarget) {
    return { ok: false, error: 'step_target_mismatch', expected: stepTargetFile(step), got: normalizedTarget };
  }
  if (!isSafeTarget(normalizedTarget)) {
    return { ok: false, error: 'target_not_in_safe_scope', target_file: normalizedTarget };
  }

  return {
    ok: true,
    verified_ready: true,
    session_id: sessionId,
    step_id: step.id,
    product: session.product_name,
    amendment_file: session.amendment_file,
    blueprint,
  };
}

export async function postBuilderBuild(baseUrl, commandKey, body) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': commandKey },
    body: JSON.stringify(body),
  });
  let json;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 800) }; }
  return { ok: res.ok, status: res.status, body: json };
}

export async function executeIntakeBlueprint({
  pool = null,
  sessionId,
  blueprint = null,
  baseUrl,
  commandKey,
  fromStepId = null,
  dryRun = false,
  onStep = null,
}) {
  let resolvedBlueprint = blueprint;
  if (!resolvedBlueprint) {
    const session = await loadIntakeSession(sessionId, { pool, baseUrl, commandKey });
    if (!session) return { ok: false, error: 'intake_session_not_found' };
    if (session.status !== 'ready') {
      return { ok: false, error: 'session_not_ready', status: session.status };
    }
    if (!session.arc_report_json?.ready_to_execute) {
      return { ok: false, error: 'arc_not_ready' };
    }
    resolvedBlueprint = session.blueprint_json;
  }
  if (!resolvedBlueprint?.steps?.length) {
    return { ok: false, error: 'no_blueprint_steps' };
  }

  const steps = sortIntakeSteps(resolvedBlueprint.steps);
  let started = !fromStepId;
  const results = [];

  for (const step of steps) {
    if (!started) {
      if (step.id === fromStepId) started = true;
      else continue;
    }

    const targetFile = stepTargetFile(step);
    const dispatch = buildStepDispatchBody(step, resolvedBlueprint, sessionId);

    if (dryRun) {
      results.push({ step_id: step.id, target_file: targetFile, dry_run: true, dispatch });
      continue;
    }

    const buildResult = await postBuilderBuild(baseUrl, commandKey, dispatch);
    const row = {
      step_id: step.id,
      target_file: targetFile,
      http_status: buildResult.status,
      committed: buildResult.body?.committed,
      ok: buildResult.ok && buildResult.body?.committed === true,
      error: buildResult.body?.error,
      violations: buildResult.body?.violations,
      detail: buildResult.body?.detail,
    };
    results.push(row);
    if (onStep) onStep(row);

    if (!row.ok) {
      return {
        ok: false,
        error: 'step_failed',
        failed_step: step.id,
        target_file: targetFile,
        builder: buildResult.body,
        results,
      };
    }
  }

  return { ok: true, steps_run: results.length, results, blueprint: resolvedBlueprint };
}
