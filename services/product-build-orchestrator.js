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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STEP_STATUS = Object.freeze({
  PENDING: 'pending',
  BUILDING: 'building',
  DONE: 'done',
  BLOCKED: 'blocked',
  FOUNDER_GATED: 'founder_gated',
});

const TERMINAL = new Set([STEP_STATUS.DONE, STEP_STATUS.BLOCKED, STEP_STATUS.FOUNDER_GATED]);

/**
 * Locate a product's BUILD_QUEUE.json from its id. Deterministic, no network.
 */
export function queuePathForProduct(productId) {
  return path.join(ROOT, 'docs/products', String(productId), 'BUILD_QUEUE.json');
}

export function loadBuildQueue(productId, { root = ROOT } = {}) {
  const p = productId.endsWith('.json')
    ? productId
    : path.join(root, 'docs/products', String(productId), 'BUILD_QUEUE.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return normalizeQueue(raw, p);
}

export function normalizeQueue(raw, sourcePath = null) {
  if (!raw || raw.schema !== 'product_build_queue_v1') {
    throw new Error('BUILD_QUEUE.json must have schema "product_build_queue_v1"');
  }
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const ids = new Set();
  for (const s of steps) {
    if (!s.id) throw new Error('every build-queue step needs an id');
    if (ids.has(s.id)) throw new Error(`duplicate build-queue step id: ${s.id}`);
    ids.add(s.id);
    if (!s.target_file) throw new Error(`step ${s.id} needs a target_file`);
    if (!s.task) throw new Error(`step ${s.id} needs a task`);
    if (!s.status) s.status = STEP_STATUS.PENDING;
    if (typeof s.attempts !== 'number') s.attempts = 0;
  }
  return { ...raw, steps, _sourcePath: sourcePath };
}

/**
 * The next actionable step: first non-terminal, non-gated step whose declared
 * dependencies are all done. Founder-gated steps are surfaced separately so the
 * loop stops re-building work only Adam can clear (the "attempt 35" waste fix).
 */
export function selectNextStep(queue) {
  const doneIds = new Set(queue.steps.filter((s) => s.status === STEP_STATUS.DONE).map((s) => s.id));
  const gated = [];
  for (const step of queue.steps) {
    if (TERMINAL.has(step.status)) continue;
    if (step.founder_gated) { gated.push(step); continue; }
    const deps = Array.isArray(step.depends_on) ? step.depends_on : [];
    if (deps.every((d) => doneIds.has(d))) return { step, gated };
  }
  return { step: null, gated };
}

export const DEFAULT_REVIVE_COOLDOWN_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_REVIVES = 6;

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
    if (step.founder_gated) continue;
    const reviveCount = typeof step.revive_count === 'number' ? step.revive_count : 0;
    if (reviveCount >= maxRevives) continue;
    const lastAt = Date.parse(step.last_attempt_at || step.completed_at || '');
    const waited = Number.isFinite(lastAt) ? now - lastAt : Infinity;
    if (waited < cooldownMs) continue;
    step.status = STEP_STATUS.PENDING;
    step.attempts = 0;
    step.revive_count = reviveCount + 1;
    step.revived_at = new Date(now).toISOString();
    revived.push(step.id);
  }
  return revived;
}

export function queueSummary(queue) {
  const by = { pending: 0, building: 0, done: 0, blocked: 0, founder_gated: 0 };
  for (const s of queue.steps) {
    const bucket = (s.founder_gated && s.status !== STEP_STATUS.DONE && s.status !== STEP_STATUS.BLOCKED)
      ? STEP_STATUS.FOUNDER_GATED
      : s.status;
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
export async function runNextStep(queue, { buildFn, verifyFn, deployProofFn, moduleHealthFn, maxAttempts = 3, logger = console } = {}) {
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
  });

  const sha = build && (build.commit_sha || build.sha);
  if (!build || !build.ok || !sha) {
    return failStep(step, queue, maxAttempts, {
      stage: 'build',
      reason: !sha ? 'no_commit_sha (claimed pass without proof — treated as failure)' : (build && build.error) || 'build_failed',
    }, logger);
  }
  step.commit_sha = sha;

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

  let deployProven = null;
  if (typeof deployProofFn === 'function') {
    const proof = await deployProofFn({ commit_sha: sha, product_id: queue.product_id, step });
    deployProven = Boolean(proof && proof.ok);
    if (!deployProven) {
      return failStep(step, queue, maxAttempts, {
        stage: 'deploy',
        reason: (proof && proof.reason) || 'deploy_does_not_serve_built_sha (not live — no false live)',
        commit_sha: sha,
      }, logger);
    }
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
  if (deployProven !== null) step.deploy_proven = deployProven;
  if (functionalProven !== null) step.functional_proven = functionalProven;
  logger?.info?.({ step: step.id, commit_sha: sha, deploy_proven: deployProven, functional_proven: functionalProven }, '[PRODUCT-BUILD] step done');
  return { ok: true, step_id: step.id, commit_sha: sha, verified: true, deploy_proven: deployProven, functional_proven: functionalProven, summary: queueSummary(queue) };
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

function failStep(step, queue, maxAttempts, info, logger) {
  step.last_error = info.reason;
  const exhausted = step.attempts >= maxAttempts;
  step.status = exhausted ? STEP_STATUS.BLOCKED : STEP_STATUS.PENDING;
  logger?.warn?.({ step: step.id, stage: info.stage, attempts: step.attempts, exhausted }, `[PRODUCT-BUILD] step ${info.stage} failed`);
  return {
    ok: false,
    step_id: step.id,
    stage: info.stage,
    reason: info.reason,
    attempts: step.attempts,
    blocked: exhausted,
    summary: queueSummary(queue),
  };
}
