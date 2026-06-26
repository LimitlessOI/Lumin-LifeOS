/**
 * SYNOPSIS: Execute ARC-ready intake skeleton blueprints step-by-step via POST /lifeos/builder/build.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import { isSafeTarget } from '../config/builder-safe-scope.js';
import { scanCodebasePatterns } from './blueprint-codebase-scanner.js';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REFERENCE_FILES_BY_TYPE = {
  esm: ['services/action-inbox.js'],
  esm_script: ['scripts/verify-builderos-working-definition.mjs'],
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
      ? 'Route factory: export function createXxxRoutes({ pool, requireKey, logger }) — returns express.Router(). Use requireKey on protected routes (NEVER rk). Deps-object signature only — NOT (app, ctx). owner_id from req.lifeosUser?.sub.'
      : 'Service factory: export function createXxx({ pool, logger }) — use pool.query(sql, params). Do NOT import ../../core/db.js or stripe SDK directly. Match reference file style in files[].',
    esm_script: 'Standalone node .mjs acceptance script — #!/usr/bin/env node, executable JavaScript ONLY (NOT a JSON manifest). fetch + x-command-key HTTP probes. Exit 0 on PASS, process.exit(1) on FAIL. No markdown fences.',
    html: 'HTML overlay page in public/overlay/',
  }[step.type] || 'Implement per blueprint purpose.';

  const scanHints = formatScanHints(step, scan, blueprint);

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
    ...(isRouteFile ? { mount_path: deriveRouteMountPath(targetFile) } : {}),
    files: depsToContextFiles(step, blueprint),
  };
}

export function deriveRouteMountPath(routeFilePath, override = null) {
  if (override) return override;
  const base = String(routeFilePath || '')
    .replace(/^routes\//, '')
    .replace(/-routes\.js$/, '');
  if (base.startsWith('lifeos-')) {
    return `/api/v1/lifeos/${base.replace(/^lifeos-/, '')}`;
  }
  return `/api/v1/${base}`;
}

export function buildVerifyFileHints(blueprint) {
  const lines = [];
  for (const step of blueprint?.steps || []) {
    const rel = stepTargetFile(step);
    if (!rel || !existsSync(join(REPO_ROOT, rel))) continue;
    const content = readFileSync(join(REPO_ROOT, rel), 'utf8');
    if (step.type === 'sql') {
      for (const match of content.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi)) {
        lines.push(`DB check: assert migration includes literal 'CREATE TABLE IF NOT EXISTS ${match[1]}'`);
      }
    }
    if (step.type === 'esm' && /routes\//.test(rel)) {
      lines.push(`Route signature check: assert routes file includes exact factory line from ${rel}`);
      if (content.includes('validate-payment-link') || content.includes('validateStripe')) {
        lines.push('POST validate-payment-link probe: expect HTTP 200, json.ok===true, and (json.valid===true OR json.validationResult?.valid===true)');
      }
    }
    if (step.type === 'esm' && /services\//.test(rel)) {
      const exportMatch = content.match(/export function create\w+/);
      if (exportMatch) {
        lines.push(`Service check: assert ${rel} includes '${exportMatch[0]}'`);
      }
    }
  }
  return lines.join('\n');
}

export function buildRouteProbeHints(blueprint) {
  const routeStep = (blueprint?.steps || []).find(
    (s) => s.type === 'esm' && /routes\//.test(String(stepTargetFile(s) || '')),
  );
  if (!routeStep) return '';
  const mount = deriveRouteMountPath(stepTargetFile(routeStep));
  return [
    `VERIFY PROBES — mount base ${mount}. Parse router.get/post/put paths from routes file in files[] ONLY.`,
    `Minimum probes with x-command-key (expect HTTP 200 and ok:true where applicable):`,
    `  GET ${mount}/sessions`,
    `  POST ${mount}/validate-payment-link with body { link: "https://buy.stripe.com/test" }`,
    `FORBIDDEN probe paths: /api/v1/marketingos/*, /integrations, /schedule/*, /rate-limits, or any path not declared in routes file.`,
    `Do NOT copy stale tests from verify-marketing-phase1.mjs.`,
  ].join('\n');
}

function isRouteStepFile(targetFile) {
  return /routes\//.test(String(targetFile || ''));
}

function formatScanHints(step, scan, blueprint = null) {
  if (!scan && step.type !== 'esm_script') return '';
  const lines = [];
  if (step.type === 'sql') {
    lines.push(`DB pattern: ${scan.db_pattern?.source || 'pool from ctx — plain SQL in .sql files only'}`);
    lines.push(`Idempotent DDL: ${scan.db_pattern?.idempotent || 'CREATE TABLE IF NOT EXISTS'}`);
  }
  if (step.type === 'esm_script') {
    lines.push('Verify script: fetch JSON from PUBLIC_BASE_URL + COMMAND_CENTER_KEY env; probe routes created in prior blueprint steps.');
    lines.push('Structure: shebang → imports (node built-ins only) → export async function runAudit() → main().catch(() => process.exit(1)); no unclosed block comments.');
    lines.push('FORBIDDEN in verify scripts: pg, pool, database imports — use fetch + x-command-key HTTP probes only.');
    lines.push('Read response body once: const text = await response.text(); then JSON.parse(text) — never response.json().catch(() => response.text()).');
    const probeHints = blueprint ? buildRouteProbeHints(blueprint) : '';
    if (probeHints) lines.push(probeHints);
    const fileHints = blueprint ? buildVerifyFileHints(blueprint) : '';
    if (fileHints) lines.push(fileHints);
  }
  if (step.type === 'esm') {
    lines.push(`DB: ${scan.db_pattern?.source || 'pool.query(sql, params) — pool injected via factory, never ../../core/*'}`);
    lines.push(`Auth: ${scan.auth_pattern?.owner_id_guard || 'req.lifeosUser?.sub for owner_id'}`);
    if (/routes\//.test(String(stepTargetFile(step) || ''))) {
      lines.push(`Route factory: export function createXxxRoutes({ pool, requireKey, logger }) — returns express.Router(); use requireKey (NEVER rk)`);
      lines.push(`Mount pattern: app.use(mountPath, createXxxRoutes({ pool, requireKey, logger }))`);
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
  if (step.type === 'esm_script') {
    for (const s of blueprint.steps || []) {
      if (s.type === 'esm_script' || s.id === step.id) continue;
      const f = stepTargetFile(s);
      if (f && !files.includes(f)) files.push(f);
    }
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

export async function postWireRoute(baseUrl, commandKey, targetFile, mountPath = null) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/lifeos/builder/wire-route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': commandKey },
    body: JSON.stringify({
      target_file: targetFile,
      ...(mountPath ? { mount_path: mountPath } : {}),
    }),
  });
  let json;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 800) }; }
  return { ok: res.ok && json?.ok === true, status: res.status, body: json };
}

export function runBlueprintAcceptance(acceptanceCmd, baseUrl, commandKey) {
  const cmd = String(acceptanceCmd || '').trim();
  const nodeMatch = cmd.match(/^node\s+(\S+)/);
  if (!nodeMatch) {
    return { ok: false, error: 'acceptance_cmd_must_be_node_script', cmd };
  }
  const scriptRel = nodeMatch[1];
  const scriptAbs = resolve(REPO_ROOT, scriptRel);
  const env = {
    ...process.env,
    PUBLIC_BASE_URL: baseUrl.replace(/\/$/, ''),
    COMMAND_CENTER_KEY: commandKey || process.env.COMMAND_CENTER_KEY || '',
  };
  const r = spawnSync('node', [scriptAbs], { env, encoding: 'utf8', cwd: REPO_ROOT });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || '').slice(-4000),
    stderr: (r.stderr || '').slice(-2000),
    script: scriptRel,
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

    spawnSync('git', ['pull', 'origin', 'main', '--ff-only'], { cwd: REPO_ROOT, encoding: 'utf8' });

    const routeWiredFromBuild = buildResult.body?.route_wired;
    if (isRouteStepFile(targetFile)) {
      if (routeWiredFromBuild?.ok && !routeWiredFromBuild?.skipped) {
        row.route_wired = routeWiredFromBuild;
      } else if (!routeWiredFromBuild?.skipped) {
        const wireResult = await postWireRoute(
          baseUrl,
          commandKey,
          targetFile,
          deriveRouteMountPath(targetFile),
        );
        row.route_wired = wireResult.body?.route_wired || wireResult.body;
        if (!wireResult.ok) {
          return {
            ok: false,
            error: 'route_wire_failed',
            failed_step: step.id,
            target_file: targetFile,
            route_wired: row.route_wired,
            results,
          };
        }
      }
    }
  }

  const acceptanceCmd = resolvedBlueprint._meta?.acceptance_cmd;
  let acceptance = null;
  if (acceptanceCmd && !dryRun) {
    acceptance = runBlueprintAcceptance(acceptanceCmd, baseUrl, commandKey);
  }

  return {
    ok: acceptance ? acceptance.ok : true,
    steps_run: results.length,
    results,
    blueprint: resolvedBlueprint,
    ...(acceptance ? { acceptance, error: acceptance.ok ? undefined : 'acceptance_failed' } : {}),
  };
}
