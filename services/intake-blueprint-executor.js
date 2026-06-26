/**
 * SYNOPSIS: Execute ARC-ready intake skeleton blueprints step-by-step via POST /lifeos/builder/build.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import { isSafeTarget } from '../config/builder-safe-scope.js';
import { scanCodebasePatterns } from './blueprint-codebase-scanner.js';

const REFERENCE_FILES_BY_TYPE = {
  esm: ['services/action-inbox.js'],
  esm_script: ['scripts/verify-marketing-phase1.mjs'],
  html: ['public/overlay/lifeos-app.html'],
};

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

export function buildStepDispatchBody(step, blueprint, sessionId, { scan = null } = {}) {
  const targetFile = stepTargetFile(step);
  const product = blueprint._meta?.product || 'product';
  const ssot = step.ssot_tag || blueprint._meta?.parent_ssot || blueprint._meta?.ssot_tag || '';
  const isRouteFile = step.type === 'esm' && /routes\//.test(String(targetFile || ''));
  const typeHint = {
    sql: 'Plain PostgreSQL migration (.sql file). CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS. SQL comments use -- only. No JavaScript, no import/export, no pool.query wrappers.',
    esm: isRouteFile
      ? 'Route factory: export function createXxxRoutes({ pool, requireKey, logger }) — express.Router(), requireKey on protected routes, owner_id from req.lifeosUser?.sub. Do NOT import ../../core/* paths.'
      : 'Service factory: export function createXxx({ pool, logger }) — use pool.query(sql, params). Do NOT import ../../core/db.js or stripe SDK directly. Match reference file style in files[].',
    esm_script: 'Standalone node .mjs acceptance script — exit 0 on PASS, non-zero on FAIL.',
    html: 'HTML overlay page in public/overlay/',
  }[step.type] || 'Implement per blueprint purpose.';

  const scanHints = formatScanHints(step, scan);

  return {
    domain: 'lifeos',
    mode: 'code',
    execution_only: false,
    model: 'gemini_flash',
    target_file: targetFile,
    task: `[intake-blueprint] ${step.id}: ${step.purpose || product}`,
    spec: [
      `Product: ${product}`,
      `Blueprint step: ${step.id}`,
      `Type: ${step.type}`,
      `Purpose: ${step.purpose || 'implement step'}`,
      `SSOT: ${ssot}`,
      typeHint,
      scanHints,
      'Reference files in files[] are STYLE GUIDES ONLY — write a complete new file for target_file; do not paste partial copies.',
      'Do not modify server.js or core/two-tier-system-init.js — register routes via existing factory pattern only.',
    ].filter(Boolean).join('\n'),
    blueprint_intake_session_id: sessionId,
    blueprint_step_id: step.id,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: mechanical intake blueprint step ${step.id} for ${product} — ARC-ready session ${sessionId}, founder gaps resolved`,
    commit_message: `[system-build] ${product} ${step.id} ${targetFile}`,
    ...(step.type === 'esm' || step.type === 'esm_script' ? { max_output_tokens: 16384 } : {}),
    files: depsToContextFiles(step, blueprint),
  };
}

function formatScanHints(step, scan) {
  if (!scan) return '';
  const lines = [];
  if (step.type === 'sql') {
    lines.push(`DB pattern: ${scan.db_pattern?.source || 'pool from ctx — plain SQL in .sql files only'}`);
    lines.push(`Idempotent DDL: ${scan.db_pattern?.idempotent || 'CREATE TABLE IF NOT EXISTS'}`);
  }
  if (step.type === 'esm') {
    lines.push(`DB: ${scan.db_pattern?.source || 'pool.query(sql, params) — pool injected via factory, never ../../core/*'}`);
    lines.push(`Auth: ${scan.auth_pattern?.owner_id_guard || 'req.lifeosUser?.sub for owner_id'}`);
    if (/routes\//.test(String(stepTargetFile(step) || ''))) {
      lines.push(`Route factory: ${scan.route_factory?.signature || 'createXxxRoutes(app, ctx)'}`);
      lines.push(`ctx keys: ${(scan.registration_pattern?.routeCtx_keys || scan.route_factory?.ctx_available || []).slice(0, 8).join(', ')}`);
    } else {
      lines.push('Service factory: export function createXxx({ pool, logger }) — match services/action-inbox.js pattern');
    }
    lines.push('FORBIDDEN: ../../core/db.js, ../../core/stripe.js, direct @anthropic-ai/sdk or openai imports');
  }
  return lines.filter(Boolean).join('\n');
}

function depsToContextFiles(step, blueprint) {
  const files = [];
  const byId = new Map((blueprint.steps || []).map((s) => [s.id, s]));
  for (const depId of step.deps || []) {
    const dep = byId.get(depId);
    const f = dep && stepTargetFile(dep);
    if (f && !files.includes(f)) files.push(f);
  }
  for (const ref of REFERENCE_FILES_BY_TYPE[step.type] || []) {
    if (!files.includes(ref)) files.push(ref);
  }
  if (step.type === 'esm' && /routes\//.test(String(stepTargetFile(step) || ''))) {
    const routeRef = 'routes/action-inbox-routes.js';
    if (!files.includes(routeRef)) files.push(routeRef);
  }
  return files.slice(0, 6);
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

  let scanPatterns = null;
  try {
    scanPatterns = await scanCodebasePatterns();
  } catch {
    scanPatterns = null;
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
    const dispatch = buildStepDispatchBody(step, resolvedBlueprint, sessionId, { scan: scanPatterns });

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
