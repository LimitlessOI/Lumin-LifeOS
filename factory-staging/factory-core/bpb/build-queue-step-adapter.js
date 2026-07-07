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

import { authorAssertionsFromSpec } from './author-assertions.js';

// Derive the narrowest sandbox boundary the governed pipe should allow for a
// BUILD_QUEUE target: the immediate top-level directory (e.g. services/x.js ->
// services/**). Falls back to the exact path for root-level files.
export function sandboxBoundaryForTarget(target) {
  const t = String(target || '').replace(/\\/g, '/');
  const slash = t.indexOf('/');
  return slash > 0 ? `${t.slice(0, slash)}/**` : t;
}

// Normalise a BUILD_QUEUE step's declared expectation into an assertion_spec.
// Recognises step.assertion_spec (object), step.expected_exports (string[]),
// step.route ({path,...}). Returns {} when nothing verifiable is declared.
export function assertionSpecFromBuildQueueStep(step) {
  if (step?.assertion_spec && typeof step.assertion_spec === 'object' && Object.keys(step.assertion_spec).length > 0) {
    return { ...step.assertion_spec };
  }
  const spec = {};
  if (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0) {
    spec.expected_exports = step.expected_exports.filter((n) => typeof n === 'string' && n.trim());
  }
  if (step?.route && typeof step.route.path === 'string' && step.route.path.trim()) {
    spec.route = step.route;
  }
  if (Array.isArray(step?.file_contains) && step.file_contains.length > 0) {
    spec.file_contains = step.file_contains.filter((s) => typeof s === 'string' && s.trim());
  }
  return spec;
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

/**
 * Convert a BUILD_QUEUE step into a governed ship-queue step. The governed pipe
 * authors the file from task+spec (author_then_write, codegen = untrusted hands)
 * then SENTRY proves it against the declared assertion_spec.
 * @returns {{ ok:boolean, step?:object, reason?:string }}
 */
export function toGovernedShipStep(step, { product_id } = {}) {
  const target = String(step?.target_file || '');
  if (!target) return { ok: false, reason: 'missing_target_file' };
  const assessment = assessBuildQueueStepProvability(step);
  if (!assessment.provable) return { ok: false, reason: assessment.reason };

  return {
    ok: true,
    step: {
      step_id: step?.id || step?.step_id || `bq-${target}`,
      action_type: 'author_then_write',
      target_file: target,
      sandbox_boundary: sandboxBoundaryForTarget(target),
      authoring: {
        task: step?.task || `Build ${target}`,
        spec: step?.spec || step?.task || '',
        ...(step?.max_output_tokens ? { max_output_tokens: step.max_output_tokens } : {}),
      },
      assertion_spec: assessment.assertion_spec,
      ...(product_id ? { product_id } : {}),
    },
  };
}

/**
 * Select the next shippable BUILD_QUEUE steps: pending (not done/blocked), not
 * founder_gated, with dependencies satisfied. Preserves queue order.
 */
export function selectShippableSteps(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const doneIds = new Set(steps.filter((s) => s.status === 'done').map((s) => s.id));
  return steps.filter((s) => {
    if (s.status === 'done' || s.status === 'blocked') return false;
    if (s.founder_gated) return false;
    const deps = Array.isArray(s.depends_on) ? s.depends_on : [];
    return deps.every((d) => doneIds.has(d));
  });
}
