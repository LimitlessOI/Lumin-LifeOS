/**
 * SYNOPSIS: STEP 5e — adapt a per-product docs/products/<id>/BUILD_QUEUE.json step
 * into a governed /factory/ship-queue step, so the throughput source the legacy
 * never-stop loop uses (its own synopsis: "work exists even when BP_PRIORITY reads
 * complete") flows through the governed pipe (BPB->Builder->SENTRY->TSOS->Historian)
 * instead of legacy /build. Chair ruling, live council receipt
 * LIFERE_COUNCIL_1783453971120: (1) walk BUILD_QUEUE steps through /factory/ship-queue
 * to preserve throughput; (2) require expected_exports/route per step at plan time so
 * BPB can author provable assertions; (3) build the governed scheduler + prove one
 * live autonomous ship BEFORE flipping GOVERNED_FACTORY_ONLY=1.
 *
 * PURE. NON-FABRICATING. A BUILD_QUEUE step is freeform ({ id, target_file, task,
 * spec, status, depends_on, founder_gated }). A server-code step becomes provable
 * ONLY if it declares an expectation (assertion_spec / expected_exports / route) —
 * otherwise it is reported NOT provable so the planner must add one (the planning
 * gate). This module never invents a success criterion the step did not declare.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { authorAssertionsFromSpec, normalizeCommonJsToEsm } from './author-assertions.js';
import { depSatisfiedForSelect, STEP_STATUS } from '../../../services/product-build-orchestrator.js';
import { REPO_ROOT } from '../repo-paths.js';

const AUTO_REGISTER_TARGET = 'config/auto-registered-product-modules.json';

// Derive the narrowest sandbox boundary the governed pipe should allow for a
// BUILD_QUEUE target: the immediate top-level directory (e.g. services/x.js ->
// services/**). Falls back to the exact path for root-level files.
export function sandboxBoundaryForTarget(target) {
  const t = String(target || '').replace(/\\/g, '/');
  const slash = t.indexOf('/');
  return slash > 0 ? `${t.slice(0, slash)}/**` : t;
}

// Parse an EXPLICIT "METHOD /path" (or bare "/path") route declaration. Returns
// null for anything that is not an unambiguous route string — never guesses.
export function parseRouteDeclaration(value) {
  if (value && typeof value === 'object' && typeof value.path === 'string' && value.path.trim()) {
    return value;
  }
  const text = String(value || '').trim();
  if (!text) return null;
  const withMethod = text.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)$/i);
  if (withMethod) return { method: withMethod[1].toUpperCase(), path: withMethod[2] };
  if (text.startsWith('/') && !/\s/.test(text)) return { path: text };
  return null;
}

// Collect the checkable expectation fields declared on a source object
// (a BUILD_QUEUE step, or its structured `acceptance` block). NON-FABRICATING:
// only reads explicitly-declared expected_exports / route / file_contains.
export function collectExpectationFields(src) {
  const spec = {};
  if (Array.isArray(src?.expected_exports) && src.expected_exports.length > 0) {
    const names = src.expected_exports.filter((n) => typeof n === 'string' && n.trim());
    if (names.length) spec.expected_exports = names;
  }
  const route = parseRouteDeclaration(src?.route);
  if (route) spec.route = route;
  if (Array.isArray(src?.file_contains) && src.file_contains.length > 0) {
    const arr = src.file_contains.filter((s) => typeof s === 'string' && s.trim());
    if (arr.length) spec.file_contains = arr;
  }
  return spec;
}

// Normalise a BUILD_QUEUE step's declared expectation into an assertion_spec.
// Recognises step.assertion_spec (object), step-level expected_exports/route/
// file_contains, and an EXPLICIT structured step.acceptance block (route as
// object or "METHOD /path" string, expected_exports, file_contains). Returns {}
// when nothing verifiable is declared. Never reads freeform task/spec prose.
export function assertionSpecFromBuildQueueStep(step) {
  if (step?.assertion_spec && typeof step.assertion_spec === 'object' && Object.keys(step.assertion_spec).length > 0) {
    return { ...step.assertion_spec };
  }
  const stepLevel = collectExpectationFields(step);
  if (Object.keys(stepLevel).length > 0) return stepLevel;
  // Fall back to an explicit, structured acceptance block authored by BPB/founder.
  return collectExpectationFields(step?.acceptance);
}

/**
 * Can the governed pipe PROVE this BUILD_QUEUE step? Reuses the same fail-closed
 * authorship contract SENTRY enforces (authorAssertionsFromSpec), so the answer
 * here matches what the runner would decide at ship time.
 * @returns {{ provable:boolean, coverage:string, assertion_spec:object, reason?:string }}
 */
export function assessBuildQueueStepProvability(step) {
  const target = String(step?.target_file || '');
  const assertion_spec = assertionSpecFromBuildQueueStep(step);
  const authored = authorAssertionsFromSpec({ target_file: target, assertion_spec });
  if (authored.ok && authored.assertions.length > 0) {
    return { provable: true, coverage: 'declared', assertion_spec };
  }
  if (authored.ok) {
    // no assertions needed — non-server-code target
    return { provable: true, coverage: 'not_required', assertion_spec };
  }
  return {
    provable: false,
    coverage: 'gap',
    assertion_spec,
    reason: `server-code BUILD_QUEUE step '${step?.id || '?'}' declares no expected_exports/route/assertion_spec — planner must add one before it can ship through the governed pipe`,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Expected-export inference for server-code BUILD_QUEUE steps
//
// The blueprint SHOULD declare expected_exports/route/file_contains. For legacy
// and incomplete BUILD_QUEUEs we infer a narrow, convention-based expectation
// from the spec prose or the target_file name, so the planner can still gate the
// step instead of leaving it stranded. The inference is conservative: route files
// get register<Name>Routes; explicit export statements in the spec take priority.
// ──────────────────────────────────────────────────────────────────────────────

function parseModuleExports(text) {
  const names = [];
  const match = text.match(/module\.exports\s*=\s*\{/s);
  if (match) {
    let depth = 1;
    let i = match.index + match[0].length;
    for (; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') { depth -= 1; if (depth === 0) break; }
    }
    const inner = text.slice(match.index + match[0].length, i);
    const keyRe = /([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g;
    let m;
    while ((m = keyRe.exec(inner)) !== null) names.push(m[1]);
    const shorthandRe = /(?:^|[,;])\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=[,;]|$)/g;
    while ((m = shorthandRe.exec(inner)) !== null) names.push(m[1]);
  }
  return [...new Set(names)];
}

function parseESMExports(text) {
  const names = [];
  // ESM declaration forms: export [async] function/const/let/var/class Name
  const re = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gi;
  let m;
  while ((m = re.exec(text)) !== null) names.push(m[1]);
  // Named export list: export { Name1, Name2 }
  const namedRe = /export\s*\{([^}]*)\}/gi;
  while ((m = namedRe.exec(text)) !== null) {
    const inner = m[1];
    const idRe = /([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let idm;
    while ((idm = idRe.exec(inner)) !== null) names.push(idm[1]);
  }
  // Prose / pseudo-code forms: "Export Name(...)" or "Exports Name(...)"
  const callFormRe = /(?:export|exports)\s+(?:async\s+)?(?:function\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gi;
  while ((m = callFormRe.exec(text)) !== null) names.push(m[1]);
  // Bare register-call fallback: Name( for route-style register functions
  const bareCallRe = /([A-Za-z_$][A-Za-z0-9_$]*Routes)\s*\(/gi;
  while ((m = bareCallRe.exec(text)) !== null) names.push(m[1]);
  return [...new Set(names)];
}

function toPascalCase(str) {
  return String(str || '')
    .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, ch) => (ch ? ch.toUpperCase() : ''))
    .replace(/^[a-z]/, (ch) => ch.toUpperCase());
}

function deriveExpectedExportsFromTargetFile(target) {
  const t = String(target || '').replace(/\\/g, '/');
  const match = t.match(/^routes\/(.*)-?routes?\.js$/i);
  if (!match) return [];
  const base = match[1].replace(/[-_]$/g, '');
  const name = `register${toPascalCase(base)}Routes`;
  return [name];
}

export function deriveExpectedExportsFromSpec(step) {
  const spec = String(step?.spec || '');
  const fromSpec = parseESMExports(spec);
  if (fromSpec.length) return fromSpec;
  const moduleExports = parseModuleExports(spec);
  if (moduleExports.length) return moduleExports;
  return deriveExpectedExportsFromTargetFile(step?.target_file);
}

// ──────────────────────────────────────────────────────────────────────────────
// Auto-register config merge
//
// config/auto-registered-product-modules.json is shared across products. Every
// product's auto-register step must append its route entries without dropping the
// entries already committed by other products. At plan time we read the current
// file, merge in the route entries implied by this step's depends_on route
// siblings, and turn the step into a deterministic write_file_exact.
// ──────────────────────────────────────────────────────────────────────────────

function deriveAutoRegisterEntry(depStep) {
  const target = String(depStep?.target_file || '');
  if (!target.startsWith('routes/')) return null;
  const names = parseESMExports(String(depStep?.spec || ''));
  const registerName = names.find((n) => n.endsWith('Routes'))
    || deriveExpectedExportsFromTargetFile(target)[0]
    || null;
  if (!registerName) return null;
  return {
    path: target,
    register: registerName,
    enabled: true,
    note: `Auto-registered for ${depStep?.id || target}`,
  };
}

function buildAutoRegisterMerge(step, queue) {
  const target = String(step?.target_file || '');
  if (target !== AUTO_REGISTER_TARGET) return null;
  if (step?.action_type === 'write_file_exact' && step?.exact_inputs?.exact_content != null) {
    return null;
  }

  const configPath = path.join(REPO_ROOT, AUTO_REGISTER_TARGET);
  let current = { modules: [] };
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    current = JSON.parse(raw);
  } catch {
    current = { modules: [] };
  }
  if (!Array.isArray(current.modules)) current.modules = [];

  const seen = new Set(current.modules.map((m) => m.path));
  const newPaths = [];
  const deps = Array.isArray(step?.depends_on) ? step.depends_on : [];
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  for (const depId of deps) {
    const dep = steps.find((s) => s.id === depId);
    if (!dep) continue;
    const entry = deriveAutoRegisterEntry(dep);
    if (entry && !seen.has(entry.path)) {
      current.modules.push(entry);
      seen.add(entry.path);
      newPaths.push(entry.path);
    }
  }

  if (newPaths.length === 0 && current.modules.length === 0) {
    return null;
  }

  const newEntries = current.modules.filter((m) => newPaths.includes(m.path));
  const exactContent = `${JSON.stringify({ modules: newEntries }, null, 2)}\n`;
  const fileContains = [];
  for (const entry of newEntries) {
    fileContains.push(entry.path, entry.register);
  }

  return {
    exactContent,
    merge: true,
    assertion_spec: fileContains.length > 0 ? { file_contains: fileContains } : {},
  };
}

/**
 * Convert a BUILD_QUEUE step into a governed ship-queue step. The governed pipe
 * authors the file from task+spec (author_then_write, codegen = untrusted hands)
 * then SENTRY proves it against the declared assertion_spec.
 * @returns {{ ok:boolean, step?:object, reason?:string }}
 */
export function toGovernedShipStep(step, { product_id, queue } = {}) {
  const target = String(step?.target_file || '');
  if (!target) return { ok: false, reason: 'missing_target_file' };

  // Auto-register config steps are merged deterministically so they never
  // overwrite each other's entries. The merge supplies exact_content + assertion_spec.
  let workingStep = step;
  const autoMerge = buildAutoRegisterMerge(step, queue);
  if (autoMerge) {
    workingStep = {
      ...step,
      action_type: 'write_file_exact',
      exact_inputs: { exact_content: autoMerge.exactContent, merge: autoMerge.merge },
      assertion_spec: autoMerge.assertion_spec,
    };
  }

  const assessment = assessBuildQueueStepProvability(workingStep);
  if (!assessment.provable) return { ok: false, reason: assessment.reason };

  const rawSpec = workingStep?.spec || workingStep?.task || '';
  const spec = normalizeCommonJsToEsm(rawSpec, target);
  const stepAuthoring = workingStep?.authoring || {};
  const tierOverride = Array.isArray(stepAuthoring.tiers) ? stepAuthoring.tiers : undefined;
  const maxOutputTokens = Number(workingStep?.max_output_tokens || stepAuthoring.max_output_tokens) || 8000;
  const moduleType = workingStep?.module_type || stepAuthoring.module_type || null;

  const governedStep = {
    step_id: workingStep?.id || workingStep?.step_id || `bq-${target}`,
    target_file: target,
    sandbox_boundary: sandboxBoundaryForTarget(target),
    assertion_spec: assessment.assertion_spec,
    ...(product_id ? { product_id } : {}),
    ...(Array.isArray(workingStep?.expected_exports) && workingStep.expected_exports.length ? { expected_exports: workingStep.expected_exports } : {}),
    ...(Array.isArray(workingStep?.behavior_assertions) && workingStep.behavior_assertions.length ? { behavior_assertions: workingStep.behavior_assertions } : {}),
    ...(workingStep?.last_error ? { last_error: workingStep.last_error } : {}),
  };

  if (workingStep?.action_type === 'write_file_exact' && workingStep?.exact_inputs?.exact_content != null) {
    governedStep.action_type = 'write_file_exact';
    governedStep.exact_inputs = {
      exact_content: workingStep.exact_inputs.exact_content,
      ...(workingStep.exact_inputs.merge === true ? { merge: true } : {}),
    };
  } else {
    governedStep.action_type = 'author_then_write';
    governedStep.authoring = {
      task: workingStep?.task || `Build ${target}`,
      spec,
      max_output_tokens: maxOutputTokens,
      ...(tierOverride ? { tiers: tierOverride } : {}),
      ...(moduleType ? { module_type: moduleType } : {}),
    };
  }

  return { ok: true, step: governedStep };
}

/**
 * Select the next shippable BUILD_QUEUE steps: pending (not terminal), not
 * founder_gated, with dependencies satisfied. Preserves queue order.
 * Uses the same chicken-egg dependency satisfaction as the legacy orchestrator
 * so auto-register config steps can run while their route sibling is blocked
 * for missing auto-registration.
 */
export function selectShippableSteps(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const doneIds = new Set(steps.filter((s) => s.status === STEP_STATUS.DONE).map((s) => s.id));
  return steps.filter((s) => {
    if (s.demoted === true) return false;
    if (s.status === STEP_STATUS.DONE || s.status === STEP_STATUS.BLOCKED || s.status === STEP_STATUS.SKIPPED || s.status === STEP_STATUS.FAILED) return false;
    if (s.founder_gated) return false;
    const deps = Array.isArray(s.depends_on) ? s.depends_on : [];
    return deps.every((d) => depSatisfiedForSelect(d, doneIds, queue, s));
  });
}
