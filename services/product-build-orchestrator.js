/**
 * SYNOPSIS: General product-build orchestrator — turns a product's structured
 * BUILD_QUEUE.json into concrete builder steps, runs each through the existing
 * build primitive + per-product verify, and advances / repairs / gates. This is
 * the "general engine that turns a product into buildable steps" the autonomy
 * audit flagged as missing (why the never-stop loop stalled with no work).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { verifyGeneratedContentGrounding } from './blueprint-grounding-check.js';
import { repairStep } from '../scripts/build-queue-drift-repair.mjs';
// STEP_STATUS/queuePathForProduct/loadBuildQueue/normalizeQueue/
// evaluateStepExpectations moved to build-queue-core.js (2026-08-10) and
// re-exported below unchanged — build-queue-drift-repair.mjs needs those same
// symbols, and importing them from here while this file imports repairStep
// FROM build-queue-drift-repair.mjs was a real circular dependency
// (`madge --circular` correctly flagged it). Every existing caller of these
// names from THIS module keeps working via the re-export.
export {
  STEP_STATUS,
  queuePathForProduct,
  loadBuildQueue,
  normalizeQueue,
  evaluateStepExpectations,
} from './build-queue-core.js';
import { STEP_STATUS, queuePathForProduct, evaluateStepExpectations } from './build-queue-core.js';
import { stepDependencies } from '../config/step-dependencies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPED_BLOCKERS_PATH = path.join(ROOT, 'builderos-reboot/governance/TYPED_BLOCKER_SSOT.json');
const PARKING_POLICY_PATH = path.join(ROOT, 'builderos-reboot/governance/BLOCKER_PARKING_POLICY.json');
const PARK_LOG = path.join(ROOT, 'data/builderos-parked-blockers.jsonl');

function loadJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function resolveTypedBlockerClass({ stage = '', reason = '' } = {}) {
  const ssot = loadJsonSafe(TYPED_BLOCKERS_PATH);
  if (!ssot) return 'BLOCKED_TOOLING';
  const signal = `${stage} ${reason}`.toLowerCase();
  for (const row of ssot.signal_map || []) {
    try {
      if (new RegExp(row.pattern, 'i').test(signal)) return row.class;
    } catch {
      /* ignore bad pattern */
    }
  }
  return ssot.stage_map?.[stage] || 'BLOCKED_TOOLING';
}

function parkBlockedStep(step, queue, info, blockerClass) {
  const policy = loadJsonSafe(PARKING_POLICY_PATH);
  const per = policy?.per_class?.[blockerClass] || {};
  if (per.action === 'retry_then_self_repair' && !per.park_default) return null;
  const parkUntilMs = per.retry_ttl_minutes
    ? Date.now() + Number(per.retry_ttl_minutes) * 60_000
    : null;
  const entry = {
    schema: 'builderos_parked_blocker_v1',
    at: new Date().toISOString(),
    product_id: queue.product_id,
    step_id: step.id,
    blocker_class: blockerClass,
    stage: info.stage,
    reason: info.reason,
    park_until: parkUntilMs ? new Date(parkUntilMs).toISOString() : null,
    owner: per.owner || null,
    action: per.action || 'park',
  };
  try {
    fs.mkdirSync(path.dirname(PARK_LOG), { recursive: true });
    fs.appendFileSync(PARK_LOG, `${JSON.stringify(entry)}\n`);
  } catch {
    /* non-fatal on read-only fs */
  }
  step.blocker_class = blockerClass;
  step.park_until = entry.park_until;
  return entry;
}

const TERMINAL = new Set([
  STEP_STATUS.DONE,
  STEP_STATUS.BLOCKED,
  STEP_STATUS.SKIPPED,
]);

function isHumanHold(step) {
  if (!step || typeof step !== 'object') return false;
  return step.human_hold === true
    || step.pause_for_founder === true
    || step.gate === 'human_hold'
    || step.gate === 'pause_for_founder';
}

function isAutoRegisterConfigStep(step) {
  return String(step?.target_file || '').replace(/\\/g, '/') === 'config/auto-registered-product-modules.json';
}

export function depSatisfiedForSelect(depId, doneIds, queue, consumingStep) {
  if (doneIds.has(depId)) return true;
  // Chicken-egg break: a route step blocked ONLY for missing auto-registration
  // must not strand the register-config step that unblocks it. Allow the
  // auto-register config step to run when its dep failed functional proof for
  // that reason — even while still PENDING (before maxAttempts → BLOCKED).
  if (!isAutoRegisterConfigStep(consumingStep)) return false;
  const dep = (queue.steps || []).find((s) => s.id === depId);
  if (!dep) return false;
  const autoRegErr = /auto-registered|not auto-registered|module-health|module_not_mounted/i.test(
    String(dep.last_error || ''),
  );
  if (!autoRegErr) return false;
  if (dep.status === STEP_STATUS.BLOCKED) return true;
  // Built file exists (commit_sha) but mount proof failed → let register step run now.
  if (dep.status === STEP_STATUS.PENDING && dep.commit_sha) return true;
  return false;
}

/**
 * The next actionable step: first non-terminal, non-gated step whose declared
 * dependencies are all done. Founder-gated steps are surfaced separately so the
 * loop stops re-building work only Adam can clear (the "attempt 35" waste fix).
 *
 * Prefer PENDING over recently-revivable BLOCKED work: blocked thrash must not
 * starve a later pending blueprint step in the same queue.
 *
 * Chicken-egg: if the next candidate is a route that already committed but only
 * failed functional proof for missing auto-registration, prefer the pending
 * auto-register config sibling instead of rebuilding the route forever.
 */
export const OVERLAY_PRINT_SLICE_ID = /^(TALOA-S64-|TALOA-P1-|TALOA-G0-|TALOA-BADGE-|TALOA-NATIVE-|TALOA-SENTRY-)/;
export const OVERLAY_PRINT_SOURCE = /TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT/i;

/** Queue may only hand the factory a slice of the uploaded overlay print. Anything else is invention. */
export function isBlueprintSlice(step, productId) {
  if (productId && productId !== 'universal-overlay') return true;
  const id = String(step?.id || '');
  if (OVERLAY_PRINT_SLICE_ID.test(id)) return true;
  if (OVERLAY_PRINT_SOURCE.test(String(step?.source || ''))) return true;
  return false;
}

export function skipNonBlueprintSlices(queue) {
  const skipped = [];
  if (!queue || queue.product_id !== 'universal-overlay' || !Array.isArray(queue.steps)) return skipped;
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.DONE || step.status === STEP_STATUS.SKIPPED) continue;
    if (isBlueprintSlice(step, queue.product_id)) continue;
    step.status = STEP_STATUS.SKIPPED;
    step.skip_reason = 'off_print — queue may only carry slices of the uploaded overlay blueprint';
    skipped.push(step.id);
  }
  return skipped;
}

export function selectNextStep(queue) {
  const doneIds = new Set(queue.steps.filter((s) => s.status === STEP_STATUS.DONE).map((s) => s.id));
  const gated = queue.steps.filter((s) => {
    if (s.status === STEP_STATUS.DONE || s.status === STEP_STATUS.BLOCKED || s.status === STEP_STATUS.SKIPPED) return false;
    return isHumanHold(s);
  });

  function consider(step) {
    if (TERMINAL.has(step.status)) return null;
    if (step.demoted === true || step.status === STEP_STATUS.SKIPPED) return null;
    if (queue.product_id === 'universal-overlay' && !isBlueprintSlice(step, queue.product_id)) return null;
    if (isHumanHold(step)) return null;
    if (step.status === STEP_STATUS.FOUNDER_GATED && !isHumanHold(step)) {
      step.status = STEP_STATUS.PENDING;
    }
    if (step.park_until) {
      const until = Date.parse(step.park_until);
      if (Number.isFinite(until) && until > Date.now()) return null;
    }
    const deps = stepDependencies(step);
    if (!deps.every((d) => depSatisfiedForSelect(d, doneIds, queue, step))) return null;

    const autoRegErr = /auto-registered|not auto-registered|module-health|module_not_mounted/i.test(
      String(step.last_error || ''),
    );
    if (
      autoRegErr
      && step.commit_sha
      && /^routes\/.+\.(js|mjs)$/.test(String(step.target_file || '').replace(/\\/g, '/'))
    ) {
      const registerSibling = (queue.steps || []).find((s) => {
        if (!isAutoRegisterConfigStep(s)) return false;
        if (TERMINAL.has(s.status) || isHumanHold(s)) return false;
        const rDeps = Array.isArray(s.depends_on) ? s.depends_on : [];
        if (!rDeps.includes(step.id)) return false;
        return rDeps.every((d) => depSatisfiedForSelect(d, doneIds, queue, s));
      });
      if (registerSibling) return registerSibling;
    }

    return step;
  }

  // Pass 1: pending/building only — never promote blocked thrash ahead of real work.
  for (const step of queue.steps) {
    if (step.status !== STEP_STATUS.PENDING && step.status !== STEP_STATUS.BUILDING) continue;
    const picked = consider(step);
    if (picked) return { step: picked, gated };
  }

  // Pass 2: anything else non-terminal (should be rare).
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.PENDING || step.status === STEP_STATUS.BUILDING) continue;
    const picked = consider(step);
    if (picked) return { step: picked, gated };
  }
  return { step: null, gated };
}

export const DEFAULT_REVIVE_COOLDOWN_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_REVIVES = 6;

/**
 * If a non-done step's declared file_contains / exports already hold on disk,
 * mark it DONE (pre_existing) instead of thrashing codegen. Used after ≥6
 * revive failures and for already-built targets the queue never closed.
 * Mutates queue.steps; returns claimed step ids.
 */
export async function claimPreExistingSatisfiedSteps(queue, {
  root = ROOT,
  now = () => new Date().toISOString(),
} = {}) {
  const claimed = [];
  if (!queue || !Array.isArray(queue.steps)) return claimed;
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.DONE) continue;
    if (isHumanHold(step)) continue;
    const hasDeclared =
      (Array.isArray(step?.file_contains) && step.file_contains.length > 0)
      || (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0);
    if (!hasDeclared) continue;
    let proof;
    try {
      proof = await evaluateStepExpectations(step, { root });
    } catch {
      continue;
    }
    if (!proof?.ok || proof.applicable === false) continue;

    // New logic: Check if the file is committed to git
    const targetPath = path.join(root, step.target_file);
    try {
      execFileSync('git', ['-C', root, 'ls-files', '--error-unmatch', targetPath]);
    } catch {
      continue; // File is either untracked or has no commits; do not mark as done
    }

    // GROUNDING CHECK: structurally present is not semantically correct.
    const grounding = verifyGeneratedContentGrounding({
      filePath: step.target_file,
      repoRoot: root,
      rejectedHashes: step?.rejected_content_hashes || [],
    });
    if (grounding.status === 'FAIL') {
      step.status = STEP_STATUS.BLOCKED;
      step.last_error = `grounding_failed: ${grounding.reason}`;
      step.grounding_status = 'FAIL';
      step.grounding_details = grounding.details;
      continue;
    }
    step.grounding_status = grounding.status;
    if (grounding.status === 'INDETERMINATE') step.grounding_details = grounding.details;

    step.status = STEP_STATUS.DONE;
    step.pre_existing = true;
    step.shipped_via = 'pre_existing_artifact_proof';
    step.shipped_at = typeof now === 'function' ? now() : now;
    step.last_error = null;
    step.demoted = false;
    step.demote_reason = null;
    step.demoted_at = null;
    step.attempts = 0;
    step.failure_signature = null;
    step.same_signature_count = 0;
    claimed.push(step.id);
  }
  return claimed;
}

/**
 * Self-healing: a step that failed maxAttempts is marked BLOCKED, which is
 * TERMINAL, so selectNextStep skips it forever. That is correct for a genuinely
 * broken step, but it also permanently strands a step that was blocked by a
 * TRANSIENT or since-fixed failure (e.g. the deploy-proof false-negative that
 * blocked already-built editor panes). Downstream steps that depend on it then
 * never build either. This revives such steps back to PENDING once a cooldown
 * has elapsed, with a bounded revive_count so a truly broken step still stops
 * (the daily cost cap is the second backstop). Founder-gated steps are never
 * revived — only Adam clears those. Mutates queue.steps; returns revived ids.
 */
export function reviveStaleBlockedSteps(queue, {
  cooldownMs = DEFAULT_REVIVE_COOLDOWN_MS,
  maxRevives = DEFAULT_MAX_REVIVES,
  now = Date.now(),
} = {}) {
  const revived = [];
  for (const step of queue.steps) {
    if (step.status !== STEP_STATUS.BLOCKED) continue;
    if (isHumanHold(step)) continue;
    if (step.demoted === true) continue;
    if (String(step.skip_reason || '').startsWith('off_print')) continue;
    if (step.escalation_required === true) continue;
    if (typeof step.same_signature_count === 'number' && step.same_signature_count >= 3 && step.escalation_required !== true) {
      step.escalation_required = true;
      step.status = STEP_STATUS.BLOCKED;
      step.escalation_note = `HARD GATE: 3+ identical failures (${step.failure_signature}). Automatic revival is disabled for this step until escalation_required is explicitly cleared by a real escalation action (external research + a second model, per founder directive 2026-07-26) -- this step will NOT auto-revive on its own again.`;
      continue;
    }
    if (step.park_until) {
      const until = Date.parse(step.park_until);
      if (Number.isFinite(until) && until > now) continue;
    }
    const reviveCount = typeof step.revive_count === 'number' ? step.revive_count : 0;
    const autoRegBlock = /auto-registered|not auto-registered|module-health|module_not_mounted/i.test(
      String(step.last_error || ''),
    );
    const artifactToolingBlock = /artifact_proof_failed:\sassertion_threw|codegen_authoring_failed|codegen_empty|codegen_threw|no_codegen_runner|authoring_requires_blueprint_assertions/i.test(
      String(step.last_error || ''),
    );
    const sentryBlock = /SENTRY_FAILED|behavior_assertion_failed|behavior_proof/i.test(
      String(step.last_error || ''),
    );
    const statusForbiddenBlock = /STEP_STATUS_FORBIDDEN/i.test(String(step.last_error || ''));
    const verifyThrash = /^verify_exit_/i.test(String(step.last_error || ''));
    // Cap thrash hard. Same error after budget → SKIPPED (terminal), stop burning tokens.
    const effectiveMax = (autoRegBlock || artifactToolingBlock || sentryBlock) ? maxRevives + 3 : maxRevives;
    if (reviveCount >= effectiveMax || (verifyThrash && reviveCount >= 2)) {
      step.status = STEP_STATUS.SKIPPED;
      step.demoted = true;
      step.demoted_at = new Date(now).toISOString();
      step.demote_reason = `revive_exhausted:${String(step.last_error || 'unknown').slice(0, 160)}`;
      continue;
    }
    const lastAt = Date.parse(step.last_attempt_at || step.completed_at || '');
    const waited = Number.isFinite(lastAt) ? now - lastAt : Infinity;
    // Auto-reg chicken-egg: ONLY revive when THIS route's register sibling is DONE.
    // (Bug was: any done register unlocked every auto-reg-blocked route → eternal thrash.)
    if (autoRegBlock) {
      const registerDone = (queue.steps || []).find((s) => {
        if (!isAutoRegisterConfigStep(s) || s.status !== STEP_STATUS.DONE) return false;
        const rDeps = Array.isArray(s.depends_on) ? s.depends_on : [];
        return rDeps.includes(step.id);
      });
      if (!registerDone) continue;
    } else if (waited < cooldownMs && !artifactToolingBlock && !sentryBlock && !statusForbiddenBlock) {
      continue;
    }
    if (artifactToolingBlock && waited < Math.min(cooldownMs, 60_000)) continue;
    step.status = STEP_STATUS.PENDING;
    step.attempts = 0;
    step.revive_count = reviveCount + 1;
    step.revived_at = new Date(now).toISOString();
    // Strip stale runtime evidence (commit/proof timestamps) but preserve the
    // previous failure message so the codegen retry prompt can see exactly what
    // SENTRY reported last time.
    const previousLastError = step.last_error;
    step.commit_sha = null;
    step.built_sha = null;
    step.proof = null;
    step.last_error = previousLastError;
    step.last_attempt = null;
    step.last_attempt_at = null;
    step.demoted = false;
    step.demote_reason = null;
    step.demoted_at = null;
    step.park_until = null;
    step.no_op = null;
    step.pre_existing = null;
    step.blocker_class = null;
    step.claim_level = null;
    step.blocker_type = null;
    step.blocker_resolution = null;
    revived.push(step.id);
  }
  return revived;
}

/**
 * Explicitly mark a blocked step as requiring investigation. Sticky: prevents
 * automatic revival across cooldown cycles while preserving normal blocked-step
 * behavior for all other steps.
 */
export function escalateBlockedStep(queue, stepId, { escalation_note, escalated_by }) {
  if (!queue || !Array.isArray(queue.steps)) {
    return { ok: false, status: 'INVALID_QUEUE', error: 'queue_or_steps_missing' };
  }
  const step = queue.steps.find((s) => s.id === stepId || s.step_id === stepId);
  if (!step) {
    return { ok: false, status: 'STEP_NOT_FOUND', error: `step_not_found:${stepId}` };
  }
  if (step.status !== STEP_STATUS.BLOCKED) {
    return { ok: false, status: 'NOT_BLOCKED', error: `step_status_is_${step.status}` };
  }
  step.escalation_required = true;
  step.escalation_note = escalation_note || null;
  step.escalated_by = escalated_by || null;
  step.escalated_at = new Date().toISOString();
  return { ok: true, status: 'ESCALATED', step_id: stepId };
}

export function queueSummary(queue) {
  const by = {
    pending: 0,
    building: 0,
    done: 0,
    blocked: 0,
    founder_gated: 0,
    design_review_flagged: 0,
    human_hold: 0,
  };
  for (const s of queue.steps) {
    if (isHumanHold(s) && s.status !== STEP_STATUS.DONE && s.status !== STEP_STATUS.BLOCKED) {
      by.human_hold += 1;
      by.founder_gated += 1;
      continue;
    }
    if (s.design_review_flagged && s.status !== STEP_STATUS.DONE && s.status !== STEP_STATUS.BLOCKED) {
      by.design_review_flagged += 1;
      continue;
    }
    const bucket = s.status;
    by[bucket] = (by[bucket] || 0) + 1;
  }
  const total = queue.steps.length;
  return { product_id: queue.product_id, total, ...by, complete: by.done === total };
}

export function persistQueue(queue, { root = ROOT } = {}) {
  const p = queue._sourcePath || queuePathForProduct(queue.product_id);
  const { _sourcePath, ...clean } = queue;
  fs.writeFileSync(p, `${JSON.stringify(clean, null, 2)}\n`);
  return p;
}

/**
 * Run the next actionable step of a product's build queue.
 *
 * Dependency-injected so it is fully unit-testable without a live builder:
 *   buildFn({ target_file, task, spec, product_id }) -> { ok, commit_sha?, error? }
 *   verifyFn({ product_id, verify_script, step })    -> { ok, detail? }
 *
 * Contract (closes audit gaps "false green" + "commit-proof transport"):
 *   - a build that returns ok but NO commit_sha is treated as FAILURE, not pass.
 *   - a step is only marked done when BOTH build (with SHA) AND verify pass.
 *   - after maxAttempts failures the step is BLOCKED (loop moves on, no spin).
 *   - OPTIONAL deployProofFn({ commit_sha }) -> { ok } proves the running deploy
 *     actually serves the built SHA before the step is called "live" (closes the
 *     "false live" gap). When provided and it fails, the step stays retryable
 *     (build/verify succeeded but the deploy hasn't caught up).
 *   - OPTIONAL moduleHealthFn({ commit_sha, step }) -> { ok, reason } is the
 *     FUNCTIONAL-PROOF gate: after the deploy is proven live, it confirms the
 *     step's module actually LOADED + MOUNTED on that deploy (read from the
 *     boot module-health manifest). A route that built + deployed but threw on
 *     import / was never registered is NOT done — it stays retryable and the
 *     verbatim mount error is carried into step.last_error so the next build
 *     attempt repairs the root cause (kills the "false done" class).
 */
export async function runNextStep(queue, { buildFn, verifyFn, deployProofFn, moduleHealthFn, artifactProofFn, maxAttempts = 3, logger = console } = {}) {
  if (typeof buildFn !== 'function') throw new Error('runNextStep requires buildFn');
  const { step, gated } = selectNextStep(queue);
  if (!step) {
    return { ok: true, done: true, awaiting_founder: gated.map((g) => g.id), summary: queueSummary(queue) };
  }

  step.status = STEP_STATUS.BUILDING;
  step.attempts += 1;
  step.last_attempt_at = new Date().toISOString();

  const build = await buildFn({
    product_id: queue.product_id,
    target_file: step.target_file,
    task: step.task,
    spec: step.spec || '',
    last_error: step.last_error || null,
    attempt: step.attempts,
    max_output_tokens: step.max_output_tokens || null,
    expected_exports: step.expected_exports || [],
    file_contains: step.file_contains || [],
    behavior_assertions: step.behavior_assertions || [],
    route: step.route || null,
    patch_mode: step.patch_mode === true,
  });

  const sha = build && (build.commit_sha || build.sha);
  if (!build || !build.ok || !sha) {
    const reason = (build && build.error)
      ? String(build.error).slice(0, 600)
      : (!sha ? 'no_commit_sha (claimed pass without proof — treated as failure)' : 'build_failed');
    return failStep(step, queue, maxAttempts, { stage: 'build', reason }, logger);
  }
  step.commit_sha = sha;

  // ARTIFACT PROOF (trust gate): declared file_contains / expected_exports / route
  // must hold on the built artifact before verify/deploy can mint DONE.
  // Closes gv-boot-wire false-done (unrelated last-touch SHA without required substring).
  let artifact = { ok: true, applicable: false, reason: 'no_artifact_proof_fn' };
  if (typeof artifactProofFn === 'function') {
    artifact = await artifactProofFn({ commit_sha: sha, product_id: queue.product_id, step });
  } else {
    artifact = await evaluateStepExpectations(step, { commitSha: sha });
  }
  if (!artifact.ok) {
    // FRA-002: attempt deterministic drift repair once before failing the step.
    try {
      const { repairStep } = await import('../scripts/build-queue-drift-repair.mjs');
      await repairStep({ product: queue.product_id, stepId: step.id, allowStubs: false, force: false });
      artifact = typeof artifactProofFn === 'function'
        ? await artifactProofFn({ commit_sha: sha, product_id: queue.product_id, step })
        : await evaluateStepExpectations(step, { commitSha: sha });
    } catch (repairErr) {
      logger?.warn?.(`[drift-repair] repair attempt failed for ${step.id}: ${repairErr.message}`);
    }
    if (!artifact.ok) {
      return failStep(step, queue, maxAttempts, {
        stage: 'artifact_proof',
        reason: artifact.reason || 'artifact_proof_failed (commit exists but step expectations not met — no false done)',
        commit_sha: sha,
      }, logger);
    }
  }
  if (artifact.applicable) step.artifact_proven = true;

  // GROUNDING CHECK: the built file must not import missing exports or reference
  // nonexistent tables before being marked done.
  const grounding = verifyGeneratedContentGrounding({
    filePath: step.target_file,
    repoRoot: ROOT,
    rejectedHashes: step?.rejected_content_hashes || [],
  });
  if (grounding.status === 'FAIL') {
    return failStep(step, queue, maxAttempts, {
      stage: 'grounding',
      reason: `grounding_failed: ${grounding.reason}`,
      commit_sha: sha,
      grounding_details: grounding.details,
    }, logger);
  }
  step.grounding_status = grounding.status;
  if (grounding.status === 'INDETERMINATE') step.grounding_details = grounding.details;

  let verify = { ok: true, detail: 'no_verify_defined' };
  if (typeof verifyFn === 'function' && (queue.verify_script || step.verify_script)) {
    verify = await verifyFn({
      product_id: queue.product_id,
      verify_script: step.verify_script || queue.verify_script,
      step,
    });
  }
  if (!verify.ok) {
    return failStep(step, queue, maxAttempts, { stage: 'verify', reason: verify.detail || 'verify_failed', commit_sha: sha }, logger);
  }

  // Wave 0 #10: deploy-truth required before DONE/live. Missing prover → BUILT_NOT_LIVE (not done).
  if (typeof deployProofFn !== 'function') {
    return failStep(step, queue, maxAttempts, {
      stage: 'deploy',
      reason: 'deploy_proof_required (BUILT_NOT_LIVE — no false live/done without deploy-truth)',
      commit_sha: sha,
      claim_level: 'BUILT_NOT_LIVE',
    }, logger);
  }
  const proof = await deployProofFn({ commit_sha: sha, product_id: queue.product_id, step });
  const deployProven = Boolean(proof && proof.ok);
  if (!deployProven) {
    return failStep(step, queue, maxAttempts, {
      stage: 'deploy',
      reason: (proof && proof.reason) || 'deploy_does_not_serve_built_sha (not live — no false live)',
      commit_sha: sha,
      claim_level: 'BUILT_NOT_LIVE',
    }, logger);
  }

  let functionalProven = null;
  if (typeof moduleHealthFn === 'function') {
    const health = await moduleHealthFn({ commit_sha: sha, product_id: queue.product_id, step });
    functionalProven = Boolean(health && health.ok);
    if (!functionalProven) {
      return failStep(step, queue, maxAttempts, {
        stage: 'functional_proof',
        reason: (health && health.reason) || 'module_not_mounted (built + live but the module did not load — no false done)',
        commit_sha: sha,
      }, logger);
    }
  }

  step.status = STEP_STATUS.DONE;
  step.completed_at = new Date().toISOString();
  step.deploy_proven = true;
  step.failure_signature = null;
  step.same_signature_count = 0;
  if (functionalProven !== null) step.functional_proven = functionalProven;
  logger?.info?.({ step: step.id, commit_sha: sha, deploy_proven: true, functional_proven: functionalProven }, '[PRODUCT-BUILD] step done');
  return { ok: true, step_id: step.id, commit_sha: sha, verified: true, deploy_proven: true, functional_proven: functionalProven, summary: queueSummary(queue) };
}

/**
 * FUNCTIONAL-PROOF evaluation (pure, network-free so it is unit-testable).
 * Given the boot module-health manifest body and a step's target_file, decide
 * whether the step is functionally proven (its module actually mounted LIVE).
 *
 * Only `routes/*.js|.mjs` targets MUST boot-mount to be provable — a route that
 * built + deployed but is not in the module-health manifest as `mounted` is
 * unreachable (false done). Non-route targets (services, migrations, config)
 * are gated by verify + deploy-proof, not by auto-registration, so they pass
 * through (`applicable:false`).
 */
export function evaluateModuleHealthForStep(healthBody, targetFile) {
  const target = String(targetFile || '');
  if (!/^routes\/.+\.(js|mjs)$/.test(target)) {
    return { ok: true, applicable: false, reason: 'no_mountable_module_for_step' };
  }
  const modules = Array.isArray(healthBody?.modules) ? healthBody.modules : [];
  const entry = modules.find((m) => m && m.module === target);
  if (!entry) {
    return {
      ok: false,
      applicable: true,
      reason: `route module not auto-registered — add {"path":"${target}","register":"<registerFn>","enabled":true} to config/auto-registered-product-modules.json so the endpoint actually mounts LIVE (built + deployed but unreachable = false done)`,
    };
  }
  if (entry.status !== 'mounted') {
    return {
      ok: false,
      applicable: true,
      reason: `module_not_mounted (${target}): ${entry.error || 'unknown import/mount failure'}`,
    };
  }
  return { ok: true, applicable: true, reason: 'module_mounted' };
}

function normalizeFailureSignature(reason, stage, blockerClass) {
  const r = String(reason || '');
  // Stable signature for STEP_STATUS_FORBIDDEN independent of twin diagnostic noise.
  const forbiddenMatch = r.match(/status is ["']([^"']+)["']/) || r.match(/\bis DONE\b/);
  if (forbiddenMatch) {
    const status = forbiddenMatch[1] ? forbiddenMatch[1].toLowerCase() : 'done';
    return `STEP_STATUS_FORBIDDEN:${status}`;
  }
  // Strip variable diagnostic tails, hex SHAs, ISO timestamps, and collapse whitespace.
  const stripped = r
    .replace(/\[[^\]]*twin[^\]]*\]/gi, '')
    .replace(/[a-f0-9]{32,}/gi, 'SHA')
    .replace(/\d{4}-\d{2}-\d{2}T[^Z\s]+Z?/g, 'TS')
    .replace(/\b[0-9a-f]{7,16}\b/gi, 'HASH')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return `${stage || 'unknown'}|${blockerClass || 'unknown'}|${stripped}`;
}

function failStep(step, queue, maxAttempts, info, logger) {
  step.last_error = info.reason;
  const blockerClass = resolveTypedBlockerClass({ stage: info.stage, reason: info.reason });
  step.blocker_class = blockerClass;
  if (info.claim_level) step.claim_level = info.claim_level;

  const newSig = normalizeFailureSignature(info.reason, info.stage, blockerClass);
  if (step.failure_signature && step.failure_signature === newSig) {
    step.same_signature_count = (typeof step.same_signature_count === 'number' ? step.same_signature_count : 0) + 1;
  } else {
    step.failure_signature = newSig;
    step.same_signature_count = 1;
  }

  let exhausted = step.attempts >= maxAttempts;
  if (step.same_signature_count >= 3) {
    exhausted = true;
    step.escalation_required = true;
    step.escalation_note = `HARD GATE: 3+ identical failures (${step.failure_signature}). Automatic revival is disabled for this step until escalation_required is explicitly cleared by a real escalation action.`;
  }
  step.status = exhausted ? STEP_STATUS.BLOCKED : STEP_STATUS.PENDING;
  let parked = null;
  if (exhausted) parked = parkBlockedStep(step, queue, info, blockerClass);
  logger?.warn?.({ step: step.id, stage: info.stage, attempts: step.attempts, exhausted, blocker_class: blockerClass, same_signature_count: step.same_signature_count }, `[PRODUCT-BUILD] step ${info.stage} failed`);
  return {
    ok: false,
    step_id: step.id,
    stage: info.stage,
    reason: info.reason,
    attempts: step.attempts,
    blocked: exhausted,
    blocker_class: blockerClass,
    claim_level: info.claim_level || null,
    parked: Boolean(parked),
    summary: queueSummary(queue),
  };
}
