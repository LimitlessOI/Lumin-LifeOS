/**
 * SYNOPSIS: Mechanical blueprint-authority gate — detect-and-route only.
 * Compares the files in a proposed commit to the active mission BLUEPRINT.json
 * and reports drift without blocking the commit.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_BLUEPRINT = path.join(
  ROOT,
  'builderos-reboot',
  'MISSIONS',
  'FACTORY-BUILDEROS-CONVERGENCE-0001',
  'BLUEPRINT.json',
);

export function loadBlueprint(blueprintPath = DEFAULT_BLUEPRINT) {
  const abs = path.isAbsolute(blueprintPath) ? blueprintPath : path.join(ROOT, blueprintPath);
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `BLUEPRINT not found: ${abs}` };
  }
  try {
    const raw = fs.readFileSync(abs, 'utf8');
    const json = JSON.parse(raw);
    return { ok: true, blueprint: json, path: abs };
  } catch (err) {
    return { ok: false, error: `Invalid BLUEPRINT JSON: ${err.message}` };
  }
}

export function evaluateBlueprintAuthority(fileEntries, options = {}) {
  const { blueprintPath = DEFAULT_BLUEPRINT } = options;
  const loaded = loadBlueprint(blueprintPath);
  if (!loaded.ok) {
    return {
      ok: false,
      warnings: [],
      errors: [loaded.error],
      findings: [{ type: 'blueprint_missing', message: loaded.error }],
    };
  }

  const { blueprint } = loaded;
  const steps = Array.isArray(blueprint.steps) ? blueprint.steps : [];
  const findings = [];
  const warnings = [];
  const errors = [];

  const normalizedEntries = fileEntries.map((entry) => {
    const p = entry.path || entry.target_file || '';
    return { ...entry, path: p.replace(/^\.?\//, '').replace(/\\/g, '/') };
  });

  // Coverage map: each file -> list of steps that claim it.
  const fileCoverage = new Map();

  for (const step of steps) {
    const allRefs = new Set([
      ...(Array.isArray(step.target_files) ? step.target_files : []),
      ...(Array.isArray(step.allowed_context_files) ? step.allowed_context_files : []),
      ...(Array.isArray(step.forbidden_context_files) ? step.forbidden_context_files : []),
    ]);

    for (const entry of normalizedEntries) {
      for (const ref of allRefs) {
        if (entry.path === ref || entry.path.startsWith(`${ref}/`)) {
          const list = fileCoverage.get(entry.path) || [];
          list.push({ step: step.step_id, phase: step.phase_id, status: step.status });
          fileCoverage.set(entry.path, list);
        }
      }
    }

    // False-done: marked DONE without git_sha or evidence.
    if (step.status === 'DONE') {
      if (!step.git_sha || !step.completed_at) {
        findings.push({
          type: 'false_done_unsealed',
          step: step.step_id,
          phase: step.phase_id,
          message: `Step ${step.step_id} is DONE but missing git_sha or completed_at`,
        });
        warnings.push(`Step ${step.step_id} DONE without evidence`);
      } else if (!step.evidence) {
        findings.push({
          type: 'done_without_evidence',
          step: step.step_id,
          phase: step.phase_id,
          message: `Step ${step.step_id} is DONE but evidence field is empty`,
        });
        warnings.push(`Step ${step.step_id} DONE without evidence text`);
      }
    }

    // Missing target files for in-progress steps: not an error, but a note.
    if (step.status === 'IN_PROGRESS') {
      for (const target of step.target_files || []) {
        if (!fs.existsSync(path.join(ROOT, target))) {
          findings.push({
            type: 'in_progress_target_missing',
            step: step.step_id,
            phase: step.phase_id,
            target,
            message: `Step ${step.step_id} target ${target} does not exist yet`,
          });
        }
      }
    }
  }

  for (const entry of normalizedEntries) {
    const coverage = fileCoverage.get(entry.path);
    if (!coverage || coverage.length === 0) {
      findings.push({
        type: 'uncovered_file',
        path: entry.path,
        message: `File ${entry.path} is not covered by any blueprint step target_files/allowed_context_files`,
      });
      warnings.push(`${entry.path} is not in any blueprint step`);
    } else {
      const doneStep = coverage.find((c) => c.status === 'DONE');
      if (doneStep) {
        findings.push({
          type: 'file_in_done_step',
          path: entry.path,
          step: doneStep.step,
          message: `File ${entry.path} belongs to a DONE step (${doneStep.step}) — changing it may be drift`,
        });
        warnings.push(`${entry.path} belongs to DONE step ${doneStep.step}`);
      }
      const inProgressStep = coverage.find((c) => c.status === 'IN_PROGRESS');
      if (inProgressStep) {
        findings.push({
          type: 'file_in_progress',
          path: entry.path,
          step: inProgressStep.step,
          message: `File ${entry.path} is covered by IN_PROGRESS step ${inProgressStep.step}`,
        });
      }
    }
  }

  // If the commit touches protected service/route directories and is not
  // covered, escalate to an error finding but still return ok:true so the
  // caller routes without blocking.
  for (const entry of normalizedEntries) {
    const coverage = fileCoverage.get(entry.path) || [];
    const isProtected = /^services\/|routes\/|middleware\/|factory-staging\/factory-core\//.test(entry.path);
    if (isProtected && coverage.length === 0) {
      findings.push({
        type: 'protected_uncovered_file',
        severity: 'error',
        path: entry.path,
        message: `Protected file ${entry.path} is not covered by the blueprint — requires GAP-FILL justification`,
      });
      errors.push(`${entry.path} protected but uncovered`);
    }
  }

  return { ok: true, warnings, errors, findings, blueprint: loaded.path };
}

export function formatBlueprintFindings(findings) {
  return findings.map((f) => `[${f.type}] ${f.message}`).join('\n');
}
