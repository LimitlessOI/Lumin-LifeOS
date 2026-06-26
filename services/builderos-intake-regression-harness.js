/**
 * SYNOPSIS: Golden intake blueprint regression — acceptance-only and dry-run dispatch probes.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  executeIntakeBlueprint,
  runBlueprintAcceptance,
  buildStepDispatchBody,
  sortIntakeSteps,
  stepTargetFile,
} from './intake-blueprint-executor.js';
import { scanCodebasePatterns } from './blueprint-codebase-scanner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HARNESS_PATH = path.join(ROOT, 'builderos-reboot/governance/BUILDEROS_INTAKE_REGRESSION_HARNESS.json');
const RECEIPT_PATH = path.join(ROOT, 'data/builderos-intake-regression-last-run.json');

export function loadIntakeRegressionHarness(manifestPath = HARNESS_PATH) {
  const abs = path.isAbsolute(manifestPath) ? manifestPath : path.join(ROOT, manifestPath);
  if (!fs.existsSync(abs)) {
    return { ok: false, error: 'harness_manifest_missing', path: abs, sessions: [] };
  }
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const sessions = Array.isArray(doc.sessions) ? doc.sessions : [];
  return { ok: true, manifest: doc, sessions, path: abs };
}

export function resolveHarnessAcceptanceCmd(entry, blueprint = null) {
  if (entry?.acceptance_cmd) return String(entry.acceptance_cmd).trim();
  return String(blueprint?._meta?.acceptance_cmd || '').trim() || null;
}

export async function runHarnessAcceptanceOnly({
  sessions,
  baseUrl,
  commandKey,
  onSession = null,
} = {}) {
  const rows = [];
  let overallOk = true;

  for (const entry of sessions || []) {
    const cmd = resolveHarnessAcceptanceCmd(entry);
    const row = {
      harness_id: entry.id,
      session_id: entry.session_id,
      product: entry.product,
      acceptance_cmd: cmd,
      ok: false,
    };

    if (!cmd) {
      row.error = 'acceptance_cmd_missing';
      overallOk = false;
      rows.push(row);
      if (onSession) onSession(row);
      continue;
    }

    if (!baseUrl || !commandKey) {
      row.error = 'missing_base_url_or_command_key';
      overallOk = false;
      rows.push(row);
      if (onSession) onSession(row);
      continue;
    }

    const acceptance = runBlueprintAcceptance(cmd, baseUrl, commandKey);
    row.ok = acceptance.ok === true;
    row.acceptance = {
      ok: acceptance.ok,
      status: acceptance.status,
      script: acceptance.script,
      stdout_tail: (acceptance.stdout || '').slice(-1500),
      stderr_tail: (acceptance.stderr || '').slice(-800),
    };
    if (!row.ok) {
      row.error = acceptance.error || 'acceptance_failed';
      overallOk = false;
    }
    rows.push(row);
    if (onSession) onSession(row);
  }

  return { ok: overallOk, mode: 'acceptance_only', results: rows };
}

export async function runHarnessDryRunDispatch({
  sessions,
  baseUrl,
  commandKey,
  onSession = null,
} = {}) {
  const rows = [];
  let overallOk = true;
  let scanPatterns = null;
  try {
    scanPatterns = await scanCodebasePatterns();
  } catch {
    scanPatterns = null;
  }

  for (const entry of sessions || []) {
    const row = {
      harness_id: entry.id,
      session_id: entry.session_id,
      product: entry.product,
      ok: false,
      steps: [],
    };

    const result = await executeIntakeBlueprint({
      sessionId: entry.session_id,
      baseUrl,
      commandKey,
      dryRun: true,
      onStep: (s) => row.steps.push({ step_id: s.step_id, target_file: s.target_file }),
    });

    if (!result.ok && result.error !== 'intake_session_not_found') {
      row.error = result.error || 'dry_run_failed';
      row.detail = result;
      overallOk = false;
      rows.push(row);
      if (onSession) onSession(row);
      continue;
    }

    if (result.error === 'intake_session_not_found' && result.blueprint) {
      row.warning = 'session_not_in_db_using_local_blueprint_unavailable';
    }

    row.ok = Boolean(result.results?.length);
    row.step_count = result.results?.length || 0;
    row.dispatch_sample = result.results?.[0]?.dispatch
      ? {
          step_id: result.results[0].step_id,
          target_file: result.results[0].target_file,
          has_intake_session: Boolean(result.results[0].dispatch?.blueprint_intake_session_id),
        }
      : null;

    if (!row.ok) {
      row.error = result.error || 'no_steps';
      overallOk = false;
    }
    rows.push(row);
    if (onSession) onSession(row);
  }

  return { ok: overallOk, mode: 'dry_run', results: rows, scan_available: Boolean(scanPatterns) };
}

export async function runIntakeRegressionHarness({
  mode = 'acceptance_only',
  baseUrl,
  commandKey,
  manifestPath,
  onSession,
} = {}) {
  const loaded = loadIntakeRegressionHarness(manifestPath);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error, path: loaded.path };
  }

  let outcome;
  if (mode === 'dry_run') {
    outcome = await runHarnessDryRunDispatch({
      sessions: loaded.sessions,
      baseUrl,
      commandKey,
      onSession,
    });
  } else if (mode === 'full') {
    const rows = [];
    let overallOk = true;
    for (const entry of loaded.sessions) {
      const result = await executeIntakeBlueprint({
        sessionId: entry.session_id,
        baseUrl,
        commandKey,
        onSession,
      });
      const row = {
        harness_id: entry.id,
        session_id: entry.session_id,
        ok: result.ok === true,
        steps_run: result.steps_run,
        error: result.error,
      };
      if (!row.ok) overallOk = false;
      rows.push(row);
      if (onSession) onSession(row);
      if (!row.ok) break;
    }
    outcome = { ok: overallOk, mode: 'full', results: rows };
  } else {
    outcome = await runHarnessAcceptanceOnly({
      sessions: loaded.sessions,
      baseUrl,
      commandKey,
      onSession,
    });
  }

  const report = {
    schema: 'builderos_intake_regression_report_v1',
    generated_at: new Date().toISOString(),
    harness_path: loaded.path,
    harness_updated_at: loaded.manifest?.updated_at,
    session_count: loaded.sessions.length,
    base_url: baseUrl || null,
    ...outcome,
  };

  return report;
}

export function writeIntakeRegressionReceipt(report, receiptPath = RECEIPT_PATH) {
  const abs = path.isAbsolute(receiptPath) ? receiptPath : path.join(ROOT, receiptPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return abs;
}

export function buildDispatchProbeFromBlueprint(blueprint, sessionId, scan = null) {
  const steps = sortIntakeSteps(blueprint?.steps || []);
  return steps.map((step) => ({
    step_id: step.id,
    target_file: stepTargetFile(step),
    dispatch: buildStepDispatchBody(step, blueprint, sessionId, { scan }),
  }));
}
